from aiokafka import AIOKafkaConsumer
import logging, asyncio
from .. import setting
from aiokafka.errors import KafkaConnectionError
from ..email_services import send_email
import json
import os

logging.basicConfig(level=logging.INFO)


async def New_user_created_consumer() -> AIOKafkaConsumer:

    consumer = AIOKafkaConsumer(
        setting.KAFKA_USER_TOPIC,
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
            if event["event_type"] == "User_Created":
                user_data = event.get("user", {})
                user_email = user_data.get("email")
                user_name = user_data.get("username")

                if not user_email:
                    logging.warning("Email not found in event. Skipping...")
                    continue
                subject = "Welcome to Online Mart"
                body = (
                    f"Dear {user_name},\n\n"
                    "Your Account Has Been Created Successfully.\n\n"
                    "We are excited to have you on board. Here are your details.\n\n"
                    f"- Name: {user_name}\n"
                    f"- Email: {user_email}\n\n"
                    "Thank you for joining us!\n\n"
                    "Best regards,\nThe Online Mart Team"
                )
                try:
                    await send_email(
                        user_email=user_email,
                        subject=subject,
                        body=body,
                    )
                    logging.info(f"Email successfullt sent to {user_email}.")
                except Exception as email_error:
                    logging.error(
                        f"Failed to send email to {user_email}: {email_error}"
                    )

    except json.JSONDecodeError as decode_error:
        logging.error(f"Failed to decode message: {msg.value}. Error: {decode_error}")

    except KeyError as key_error:
        logging.error(f"Missing key in event: {key_error}")
        # send_email(
        #     to=event["email"],
        #     subject="Welcome to Online Mart",
        #     body=f"Welcome to Online Mart! Thank you for joining us. We're excited to have you on board. Best regards, The Online Mart Team",
        # )
        # print("Email Sent Successfully....")

    finally:
        await consumer.stop()
        logging.info("Consumer Stopped...")
