from sqlmodel import SQLModel, Field
from typing import Optional
from pydantic import EmailStr


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    username: str = Field(index=True, unique=True, nullable=False)
    email: EmailStr = Field(index=True, nullable=False, unique=True)
    hashed_password: Optional[str] = Field(default=None)
    role: str = Field(default="buyer")  # buyer, seller, admin
    auth_provider: str = Field(default="local")  # local or google
    google_id: Optional[str] = Field(default=None, unique=True)


class CreateUser(SQLModel):
    username: str
    email: EmailStr
    plain_password: str
    role: str = "buyer"  # buyer, seller, admin


class GoogleAuthRequest(SQLModel):
    id_token: Optional[str] = None
    access_token: Optional[str] = None


class Token(SQLModel):
    access_token: str
    token_type: str
