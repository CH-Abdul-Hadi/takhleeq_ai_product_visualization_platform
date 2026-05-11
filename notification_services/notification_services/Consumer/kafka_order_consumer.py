from aiokafka import AIOKafkaConsumer
import logging
import asyncio
from aiokafka.errors import KafkaConnectionError
from ..email_services import send_email
from .. import setting
import json
import os


logging.basicConfig(level=logging.INFO)


async def kafka_order_Created_consumer() -> AIOKafkaConsumer:

    consumer = AIOKafkaConsumer(
        setting.KAFKA_ORDER_CREATED_TOPIC,
        bootstrap_servers=setting.KAFKA_BOOTSTRAP_SERVER,
        group_id=setting.KAFKA_CONSUMER_GROUP_ID_FOR_NOTIFICATION_SERVICE,
        auto_offset_reset="earliest",
    )

    while True:
        try:
            await consumer.start()
            logging.info("Consumer Started...")
            break
        except KafkaConnectionError as e:
            logging.error(f"Consumer starting failed: {e}. Retry in 5 sec...")
            await asyncio.sleep(5)

    try:
        async for msg in consumer:
            event = json.loads(msg.value.decode("utf-8"))
            print(type(event))
            print(f"Event Received: {event}")
            if event["event_type"] == "Order_Created":
                user_data = event.get("order", {})
                # user_id =user_data.get("id")
                user_email = user_data.get("user_email")
                order_id = user_data.get("order_id")
                product_id = user_data.get("product_id")
                total_amount = user_data.get("total_amount")
                if not user_email:
                    logging.warning("Email not found in event. Skipping...")
                    continue
                subject = "Order Confirmation"
                body = f"""Your Order Has Been Created Successfully!

Order Details:

- Order ID: {order_id}
- Product ID: {product_id}
- Total Amount: {total_amount}
                    
Thank you for choosing Qureshi Online Mart. We appreciate your trust in us.
                    
Best regards,
The Online Mart Team
"""
                try:
                    await send_email(
                        user_email=user_email,
                        subject=subject,
                        body=body,
                    )
                    logging.info(f"Order Confirmation email sent to {user_email}")
                except Exception as email_error:
                    logging.error(
                        f"Failed to send order confirmation email to {user_email}: {email_error}"
                    )
            elif event["event_type"] == "Order_Deleted":
                user_data = event.get("order", {})
                # user_id = user_data.get("id")
                user_email = user_data.get("user_email")
                order_id = user_data.get("order_id")
                product_id = user_data.get("product_id")
                if not user_email:
                    logging.warning("Email not found in event. Skipping...")
                    continue
                subject = "Order Cancellation"
                body = f"""Your Order Has Been Cancelled Successfully!

Order Details:

- Order ID: {order_id}
- Product ID: {product_id}


Thank you for choosing Qureshi Online Mart. We appreciate your trust in us.

Best regards,
The Online Mart Team
"""
                try:
                    await send_email(
                        user_email=user_email,
                        subject=subject,
                        body=body,
                    )
                    logging.info(f"Order Cancellation email sent to {user_email}")
                except Exception as email_error:
                    logging.error(
                        f"Failed to send order cancellation email to {user_email}: {email_error}"
                    )
    except json.JSONDecodeError as decode_error:
        logging.error(f"Failed to decode message: {msg.value}. Error: {decode_error}")

    except KeyError as key_error:
        logging.error(f"Missing key in event: {key_error}")
    finally:
        await consumer.stop()
        logging.info("Consumer Stopped...")


# async def get_user_email(user_id: int):
#     try:
#         async with aiohttp.ClientSession() as session:
#             async with session.get(f"{user_id}") as response:
#                 if response.status == 200:
#                     user_data = await response.json()
#                     return user_data.get("email")
#                 else:
#                     logging.error(f"Failed to fetch user data. Status code: {response.status}")
#                     return None
#     except Exception as e:
#         logging.error(f"Error fetching user data: {e}")
#         return None
