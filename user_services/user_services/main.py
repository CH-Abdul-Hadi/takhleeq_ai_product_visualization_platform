import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Annotated, AsyncGenerator, Dict, Optional

from aiokafka import AIOKafkaProducer
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from . import setting
from .consumer import consume
from .database import create_db_and_tables, get_session
from .model import CreateUser, GoogleAuthRequest, Token, User
from .producer import kafka_producer
from .schema import authenticate_user, bcrypt_context
from .utils import create_access_token, decode_access_token





@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan:
    - Create database tables
    - Start background Kafka consumer task
    - On shutdown, cancel the task and await it
    """
    print("Creating Tables...")
    # Ensure DB tables exist before starting background consumers
    create_db_and_tables()

    # Start Kafka consumer in background
    consumer_task = asyncio.create_task(consume())

    try:
        yield
    finally:
        # Cancel and await consumer task on shutdown
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            print("Kafka consumer task cancelled.")


app: FastAPI = FastAPI(lifespan=lifespan, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


@app.post("/Signup", status_code=status.HTTP_201_CREATED)
async def create_user(
    user: CreateUser,
    db: Annotated[Session, Depends(get_session)],
    producer: Annotated[AIOKafkaProducer, Depends(kafka_producer)],
) -> Dict[str, str]:
    username = user.username.strip()

    if not username or not user.plain_password:
        raise HTTPException(
            status_code=400, detail="Please Enter Username or Password...."
        )

    if any(char.isspace() for char in username):
        raise HTTPException(
            status_code=400, detail="Username cannot contain spaces"
        )

    # Validate role
    if user.role not in ("buyer", "seller", "admin"):
        raise HTTPException(
            status_code=400, detail="Role must be 'buyer', 'seller', or 'admin'"
        )

    new_user = User(
        username=username,
        email=user.email,
        hashed_password=bcrypt_context.hash(user.plain_password),
        role=user.role,
        auth_provider="local",
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="User Already Exists...")

    event = {
        "event_type": "User_Created",
        "user": {
            "username": username,
            "email": user.email,
            "role": user.role,
        },
    }
    await producer.send_and_wait(
        setting.KAFKA_USER_TOPIC, json.dumps(event).encode("utf-8")
    )
    print("User_data sent to kafka topic")
    return {"message": "User Account Created Successfully"}


@app.post("/login", response_model=Token)
async def login_with_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_session)],
) -> Token:
    logger = logging.getLogger("user_services.main")
    logger.info("Login attempt for identifier=%s", form_data.username)

    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        logger.info(
            "Login failed for identifier=%s: could not validate user",
            form_data.username,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could Not Validate User"
        )

    # Ensure user.id is an int (fallback to 0 if unexpectedly None)
    user_id = int(user.id) if user.id is not None else 0
    logger.info("Login successful for user id=%s, email=%s", user_id, user.email)

    access_token = create_access_token(
        user.username,
        user_id,
        user.role,
        timedelta(minutes=setting.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer")





@app.post("/auth/google", response_model=Token)
async def google_auth(
    request: GoogleAuthRequest,
    db: Annotated[Session, Depends(get_session)],
    producer: Annotated[AIOKafkaProducer, Depends(kafka_producer)],
) -> Token:
    """
    Google OAuth login/signup:
    1. Verify the Google ID token (do imports lazily so service can start even if google libs missing)
    2. If user exists → login
    3. If user doesn't exist → auto-create with role='buyer'
    4. Return JWT access token
    """
    try:
        # Lazy import so that static analysis or missing libs at import time don't break the app
        from google.auth.transport import requests as google_requests  # type: ignore
        from google.oauth2 import id_token as google_id_token  # type: ignore
    except Exception as e:
        # Provide a clear runtime error if google auth libs are not available
        raise HTTPException(
            status_code=500,
            detail="Google authentication libraries are not installed on the server.",
        )

    try:
        print(f"Verifying Google token with client_id: {str(setting.GOOGLE_CLIENT_ID)}")
        idinfo = google_id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            str(setting.GOOGLE_CLIENT_ID),
        )
        print(f"Token verified successfully: {idinfo.get('email')}")
    except ValueError as e:
        print(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google ID token")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", email.split("@")[0])

    # Check if user already exists (prefer google_id then email)
    user = db.exec(select(User).where(User.google_id == google_id)).first()
    if not user:
        user = db.exec(select(User).where(User.email == email)).first()

    if user:
        # Existing user — link Google account if not already linked
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = "google"
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        # New user — auto-create
        user = User(
            username=name,
            email=email,
            hashed_password=None,
            role="buyer",
            auth_provider="google",
            google_id=google_id,
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=400, detail="Could not create user")

        # Publish user created event
        event = {
            "event_type": "User_Created",
            "user": {
                "username": name,
                "email": email,
                "role": "buyer",
                "auth_provider": "google",
            },
        }
        await producer.send_and_wait(
            setting.KAFKA_USER_TOPIC, json.dumps(event).encode("utf-8")
        )
        print("Google user created and sent to kafka topic...")

    # Ensure user.id is an int (should be present after commit/refresh)
    user_id = int(user.id) if user.id is not None else 0

    # Generate JWT
    access_token = create_access_token(
        user.email,
        user_id,
        user.role,
        timedelta(minutes=setting.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/get_access_token")
def get_access_token(email: str, role: str = "buyer", user_id: Optional[int] = None):
    access_token_expire = timedelta(minutes=setting.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Coerce None to a safe integer (0) because create_access_token expects an int
    numeric_user_id = int(user_id) if user_id is not None else 0
    access_token = create_access_token(
        email, numeric_user_id, role, expires_delta=access_token_expire
    )
    return {"access_token": access_token}


@app.get("/decode_token")
def decode_token(access_token: str):
    try:
        decoded = decode_access_token(access_token)
        return {"decode_token": decoded}
    except Exception as e:
        return {"error": str(e)}


@app.get("/user/all")
def get_all_user(db: Annotated[Session, Depends(get_session)]):
    users = db.exec(select(User)).all()
    return users


@app.get("/user/me")
def read_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_session)],
):
    user_token_data = decode_access_token(token)
    sub = user_token_data.get("sub", "")
    # sub may be username (from /login) or email (from /login_json or /auth/google)
    # Search by email first, then by username as fallback
    user = db.exec(select(User).where((User.email == sub) | (User.username == sub))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/user/{user_id}")
async def get_user_details(
    user_id: int,
    db: Annotated[Session, Depends(get_session)],
    token: Annotated[str, Depends(oauth2_scheme)],
):
    # token is required to ensure caller is authenticated; we decode but do not enforce roles here
    _ = decode_access_token(token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.delete("/user/delete/{user_id}")
async def delete_user(user_id: int, db: Annotated[Session, Depends(get_session)]):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User Deleted Successfully"}
