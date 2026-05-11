from aiokafka import AIOKafkaConsumer
import asyncio, logging
from .. import setting
from aiokafka.errors import KafkaConnectionError
from .. import email_services
import json
import os

logging.basicConfig(level=logging.INFO)


async def kafka_payment_consumer() -> AIOKafkaConsumer:

    consumer = AIOKafkaConsumer(
        setting.KAFKA_PAYMENT_TOPIC,
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
            if event["event_type"] == "Payment_Created":
                payment_data = event.get("payment", {})
                amount = event.get("amount")
                order_id = event.get("order_id")
                subject = "Payment Confirmation"
                body = f"""Your Payment Has Been Done Successfully!

Payment Details:

We are delighted to confirm that your payment of {amount} has been successfully processed. Your order with ID {order_id} is now being processed and will be shipped to you shortly.

Thank you for choosing Qureshi Online Mart.

Best regards,
The Online Mart Team
"""
                user_email = payment_data.get("user_email")
                if not user_email:
                    logging.warning("Email not found in event. Skipping...")
                    continue
                try:
                    await email_services.send_email(
                        user_email=user_email,
                        subject=subject,
                        body=body,
                    )
                    logging.info(f"Payment Confirmation email sent to {user_email}")
                except Exception as email_error:
                    logging.error(
                        f"Failed to send payment confirmation email to {user_email}: {email_error}"
                    )
            elif event["event_type"] == "Payment_Deleted":
                payment_data = event.get("payment", {})
                amount = event.get("amount")
                order_id = event.get("order_id")
                subject = "Payment Cancellation"
                body = f"""Your Payment Has Been Cancelled Successfully!

Payment Details:

We regret to inform you that your payment of {amount} for order {order_id} has been cancelled. If you have any concerns, please contact our support team.

Thank you for choosing Qureshi Online Mart.

Best regards,
The Online Mart Team
"""
                user_email = payment_data.get("user_email")
                if not user_email:
                    logging.warning("Email not found in event. Skipping...")
                    continue
                try:
                    await email_services.send_email(
                        user_email=user_email,
                        subject=subject,
                        body=body,
                    )
                    logging.info(f"Payment Cancellation email sent to {user_email}")
                except Exception as email_error:
                    logging.error(
                        f"Failed to send payment cancellation email to {user_email}: {email_error}"
                    )

    finally:
        await consumer.stop()
