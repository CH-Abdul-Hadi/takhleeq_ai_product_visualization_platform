from sqlmodel import SQLModel, Field , create_engine , Session
from sqlalchemy import text
from . import setting
from typing import Optional
from pydantic import EmailStr 

class Order(SQLModel , table=True):
    order_id : Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    user_email : EmailStr = Field(index=True , nullable=False)
    product_id : int 
    total_amount : int = Field(default = None)
    product_quantity : int = Field(default=None)
    product_price: int = Field(default=None)
    payment_status : str = Field(default="Pending")
    custom_design_id: Optional[int] = Field(default=None)
    custom_product_name: Optional[str] = Field(default=None)
    custom_product_image: Optional[str] = Field(default=None)



class Order_request(SQLModel):
    order_id : int
    product_id : int
    product_quantity : int
    total_amount : int
    product_price: int = Field(default=None)
    custom_design_id: Optional[int] = Field(default=None)
    custom_product_name: Optional[str] = Field(default=None)
    custom_product_image: Optional[str] = Field(default=None)

class OrderResponse(SQLModel):
    order_id : int
    user_id : int
    product_id : int
    total_amount : int
    product_quantity : int
    product_price: int = Field(default=None)
    payment_status : str
    custom_design_id: Optional[int] = Field(default=None)
    custom_product_name: Optional[str] = Field(default=None)
    custom_product_image: Optional[str] = Field(default=None)


class User(SQLModel):
    # id : Optional[int] = Field(default=None , primary_key=True, index=True)
    username : str = Field(index=True , unique=True , nullable=False)
    email : EmailStr = Field(index=True, nullable=False , unique=True)
    hashed_password : str

class create_user(SQLModel):
    username : str
    password : str



connection_string = str(setting.ORDER_DATABASE_URL).replace(
    "postgresql" , "postgresql+psycopg2"
)

engine =create_engine(connection_string , connect_args={} , pool_recycle=300)


def create_db_and_tables()->None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS custom_design_id INTEGER"))
        conn.execute(text("ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS custom_product_name VARCHAR"))
        conn.execute(text("ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS custom_product_image TEXT"))




def get_db():
    with Session(engine) as session:
        yield session
