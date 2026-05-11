from contextlib import asynccontextmanager
from typing import  AsyncGenerator, Optional
from fastapi import  FastAPI, Query
from pydantic import BaseModel
from sqlmodel import  Session
# from .database import engine , create_db_and_tables
# from .email_services import send_email
import asyncio , logging
from . import setting
from .Consumer import kafka_user_consumer , kafka_order_consumer , kafka_payment_consumer
from .email_services import send_email
from .notification_store import get_notifications
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)

CONTACT_RECIPIENT_EMAIL = "hasaanqurashi150@gmail.com"


class ContactMessage(BaseModel):
    first_name: str
    last_name: str
    email: str
    subject: str
    message: str


@asynccontextmanager
async def lifespan(app : FastAPI)->AsyncGenerator[None,None]:
    print("Tables Creating...")
    loop = asyncio.get_event_loop()
    task1 = loop.create_task(kafka_user_consumer.New_user_created_consumer())
    task2 = loop.create_task(kafka_order_consumer.kafka_order_Created_consumer())
    task3 = loop.create_task(kafka_payment_consumer.kafka_payment_consumer())
    logging.info("Kafka consumers started...")

    try:
        yield  # Application runs while tasks are alive
    finally:
        logging.info("Shutting down Kafka consumers...")
        
        # Cancel tasks gracefully
        for task in [task1, task2, task3]:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logging.info(f"Task {task} cancelled successfully.")
        
        logging.info("Application lifespan ended.")

#    task3 = loop.create_task(kafka_payment_consumer.kafka_payment_consumer())
#    task = asyncio.create_task(New_user_created_consumer())
#    create_db_and_tables()
#    try:
#        yield
#    finally:
#        for task in [task1, task2, task3]:
#            task.cancel()
#            try:
#                await task
#            except asyncio.CancelledError:
#                pass



app : FastAPI = FastAPI(lifespan=lifespan , version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def get_db():
    with Session(engine) as session:
        yield session




@app.get("/")
def get_root():
    return{"message" : "Welcome To Notification Service..."}


@app.get("/get_notification")
def get_notification(user_email: Optional[str] = Query(default=None)):
    return {"notifications": get_notifications(user_email)}


@app.get("/notifications")
def list_notifications(user_email: Optional[str] = Query(default=None)):
    return {"notifications": get_notifications(user_email)}


@app.post("/contact")
async def send_contact_message(payload: ContactMessage):
    subject = f"Contact Form: {payload.subject}"
    body = (
        "New contact form message received.\n\n"
        f"Name: {payload.first_name} {payload.last_name}\n"
        f"Email: {payload.email}\n"
        f"Subject: {payload.subject}\n\n"
        f"Message:\n{payload.message}"
    )
    await send_email(
        user_email=CONTACT_RECIPIENT_EMAIL,
        subject=subject,
        body=body,
    )
    return {"message": "Contact message sent successfully."}

# @app.on_event("startup")
# async def startup_event():
#     asyncio.create_task(kafka_consumer())


# async def kafka_producer():
#     producer = AIOKafkaProducer(bootstrap_servers=str("broker:19092"))
#     await producer.start()
#     return producer


# # @app.post("/signup")
# # async def signup_notify(user_id : int , session : Annotated[Session, Depends(get_db)]):
# #     message = "Thanks For Using Our Services And For SigningUp!"
# #     await send_notification_event(user_id , "sign_up" , message)
# #     return {"message" : "SignUp Notification Sent..."}


# # @app.post("/Login")
# # async def login_notify(user_id : int , session : Annotated[Session, Depends(get_db)]):
# #     message = "You Have Successfully Logged In..."
# #     await send_notification_event(user_id , "Login" , message)
# #     return{"messge" : "Login Notification Sent..."}


# # @app.post("/order_status")
# # async def order_status(user_id : int , status : str , session : Annotated[Session,Depends(get_db)]):
# #     message = f"Your Order Status Has Been Updated To: {status}"
# #     await send_notification_event(user_id , "order_status" , message)
# #     return {"message" : "Order Status Notification Sent"}

# # @app.post("/delivery_update")
# # async def delivery_notify(user_id : int , delivery_status : str , session : Annotated[Session, Depends(get_db)]):
# #     message = f"Your Delivery Status: {delivery_status}"
# #     await send_notification_event(user_id , "Delivery" , message)
# #     return {"message" : "Delivery Notification Sent..."}


# @app.post("/send_notification")
# async def send_notification(to_email : str , subject : str , message : str):
#     send_email(to_email, subject, message)
#     return {"message" : "Email Sent Successfully..."}

