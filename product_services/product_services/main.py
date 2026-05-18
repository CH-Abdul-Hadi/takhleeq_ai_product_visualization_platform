import asyncio
import base64
import json
import logging
from contextlib import asynccontextmanager
from typing import Annotated, AsyncGenerator, List, Optional
from aiokafka import AIOKafkaProducer
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from fastapi.responses import RedirectResponse
from . import setting
from .authenticate import validate_role
from .cloudinary_service import delete_image, upload_image
from .consumer import consume_messages
from .database import Product, Session, create_db_and_tables, get_session
from .producer import kafka_producer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up product service...")
    logger.info(
        f"Connecting to database: {str(setting.PRODUCT_SERVICE_DATABASE_URL)[:50]}..."
    )
    logger.info(f"Kafka bootstrap server: {setting.KAFKA_BOOTSTRAP_SERVER}")
    logger.info(f"Kafka product topic: {setting.KAFKA_PRODUCT_TOPIC}")

    try:
        logger.info("Creating database tables...")
        create_db_and_tables()
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise

    try:
        logger.info("Starting Kafka consumer task...")
        task = asyncio.create_task(
            consume_messages(
                setting.KAFKA_PRODUCT_TOPIC, setting.KAFKA_BOOTSTRAP_SERVER
            )
        )
        logger.info("Kafka consumer task started.")
    except Exception as e:
        logger.error(f"Failed to start Kafka consumer: {e}")
        raise

    yield

    logger.info("Shutting down product service...")
    # Note: The consumer task runs indefinitely, so cleanup might not be reached
    # unless there's a specific shutdown mechanism


app: FastAPI = FastAPI(lifespan=lifespan, version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/product", response_model=Product)
async def product_service(
    Product_id: Annotated[int, Form()],
    Product_name: Annotated[str, Form()],
    Product_details: Annotated[str, Form()],
    product_quantity: Annotated[int, Form()],
    price: Annotated[float, Form()],
    producer: Annotated[AIOKafkaProducer, Depends(kafka_producer)],
    session: Annotated[Session, Depends(get_session)],
    token_data: Annotated[dict, Depends(validate_role(["seller", "admin"]))],
    file: Optional[UploadFile] = File(None),
    category: Optional[str] = Form(None),
) -> Product:
    """Create a new product with optional image upload.

    If Cloudinary is configured, store secure URL in product_image.
    Otherwise, fallback to base64 storage for local/dev compatibility.
    """

    product_image_value = None
    if file:
        file_bytes = await file.read()
        uploaded_url = upload_image(file_bytes, file.filename)
        if uploaded_url:
            product_image_value = uploaded_url
        else:
            product_image_value = base64.b64encode(file_bytes).decode("utf-8")

    product = Product(
        product_id=Product_id,
        Product_name=Product_name,
        Product_details=Product_details,
        product_quantity=product_quantity,
        price=price,
        product_image=product_image_value,
        category=category,
    )

    session.add(product)
    session.commit()
    session.refresh(product)
    try:
        event = {"event_type": "Product_Created", "product": product.dict()}
        await producer.send_and_wait(
            setting.KAFKA_PRODUCT_TOPIC, json.dumps(event).encode("utf-8")
        )
        print("Product Send to Kafka topic")
    except Exception as e:
        print("Error Sending to Kafka", e)

    return product


@app.get("/categories", response_model=List[str])
async def get_categories(
    session: Annotated[Session, Depends(get_session)],
    token_data: Annotated[dict, Depends(validate_role(["seller", "admin", "buyer"]))],
):
    """Return a deduplicated, sorted list of all product categories in the database."""
    products = session.exec(select(Product)).all()
    categories = sorted(
        {p.category for p in products if p.category}
    )
    return categories


@app.get("/product/", response_model=list[Product])
async def get_product(
    session: Annotated[Session, Depends(get_session)],
):
    products = session.exec(select(Product)).all()
    # Keep client compatibility: if DB stores URL, force clients to use /image endpoint.
    sanitized_products = []
    for p in products:
        if p.product_image and p.product_image.startswith("http"):
            product_data = p.dict()
            product_data["product_image"] = None
            sanitized_products.append(Product(**product_data))
        else:
            sanitized_products.append(p)
    return sanitized_products


@app.put("/product/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: Product,
    producer: Annotated[AIOKafkaProducer, Depends(kafka_producer)],
    session: Annotated[Session, Depends(get_session)],
    token_data: Annotated[dict, Depends(validate_role(["seller", "admin"]))],
):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product Not Found")

    for fields, value in product.dict(exclude_unset=True).items():
        setattr(db_product, fields, value)

    session.commit()
    session.refresh(db_product)
    try:
        event = {"event_type": "Product_Updated", "product": product.dict()}
        await producer.send_and_wait(
            setting.KAFKA_PRODUCT_TOPIC, json.dumps(event).encode("utf-8")
        )
        print("Updated_Product Send to Kafka topic")
    except Exception as e:
        print("Error Sending to Kafka", e)

    return db_product


@app.delete("/product/{product_id}", response_model=Product)
async def delete_product(
    product_id: int,
    session: Annotated[Session, Depends(get_session)],
    producer: Annotated[AIOKafkaProducer, Depends(kafka_producer)],
    token_data: Annotated[dict, Depends(validate_role(["seller", "admin"]))],
):
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product Not Found")
    product_dict = {field: getattr(db_product, field) for field in db_product.dict()}
    product_json = json.dumps(product_dict).encode("utf-8")
    print("product_json", product_json)
    if db_product.product_image and db_product.product_image.startswith("http"):
        delete_image(db_product.product_image)

    session.delete(db_product)
    session.commit()
    try:
        event = {"event_type": "Product_Deleted", "product": product_dict}
        await producer.send_and_wait(
            setting.KAFKA_PRODUCT_TOPIC, json.dumps(event).encode("utf-8")
        )
        print("Deleted_Product Send to Kafka topic")
    except Exception as e:
        print("Error sending to Kafka:", e)

    return db_product


@app.get("/product/{product_id}/image")
async def get_product_image(
    product_id: int,
    session: Session = Depends(get_session),
):
    """Get product image.

    - If stored value is a Cloudinary URL, redirect to it.
    - If stored value is base64, return JSON payload for backward compatibility.
    """
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product Not Found")
    if not db_product.product_image:
        raise HTTPException(
            status_code=404, detail="No image uploaded for this product"
        )

    if db_product.product_image.startswith("http"):
        return RedirectResponse(url=db_product.product_image)

    return {"product_id": product_id, "product_image": db_product.product_image}


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {
        "status": "healthy",
        "service": "product-service",
        "message": "Product service is running and ready to accept requests",
    }
