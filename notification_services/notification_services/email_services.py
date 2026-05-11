import smtplib , logging
from email.mime.text import MIMEText
from fastapi import HTTPException
from . import setting
from .notification_store import record_email_notification



logging.basicConfig(level=logging.INFO)


# async def fetch_user_email(user_id : int):
#     try:


async def send_email(user_email : str , body : str , subject : str):
    try:
        record_email_notification(user_email=user_email, subject=subject, body=body)
        sender_email = setting.SENDER_EMAIL
        sender_password = setting.SENDER_PASSWORD
        
        # Check if email credentials are configured
        if not sender_email or sender_email == "your-email@gmail.com" or not sender_password:
            logging.warning(f"Email credentials not configured. Skipping email to {user_email}")
            logging.info(f"Would have sent email to {user_email} with subject: {subject}")
            logging.info(f"Email content: {body[:100]}...")
            return

        message = MIMEText(body , "plain")
        message["Subject"] = subject
        message["From"] = sender_email
        message["To"] = user_email

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, user_email, message.as_string())
            logging.info(f"Sending Email to {user_email} with Subject: {subject}")
        logging.info("Email Sent Successfully...")
    except smtplib.SMTPAuthenticationError as e:
        logging.error(f"SMTP Authentication failed for {user_email}: {str(e)}")
        logging.warning("Please check your email credentials and ensure you're using an app password for Gmail")
    except smtplib.SMTPException as e:
        logging.error(f"SMTP error sending email to {user_email}: {str(e)}")
    except Exception as e:
        logging.error(f"Error sending email to {user_email}: {str(e)}")
        # Don't raise HTTPException in consumer context, just log the error
        logging.warning("Email sending failed but continuing with other operations")


























#     msg = MIMEText(body)
#     msg['Subject'] = subject
#     msg['From'] = SENDER_EMAIL
#     msg['To'] = to

#     with smtplib.SMTP(SMTP_SERVER , SMTP_PORT) as server:
#         server.login(SENDER_EMAIL, SENDER_PASSWORD)
#         server.sendmail(SENDER_EMAIL, [to] , msg.as_string())


    # try:
    #     with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
    #         server.starttls()
    #         server.login(SENDER_EMAIL, SENDER_PASSWORD)

    #     # create Email 

    #         email_message = MIMEMultipart()
    #         email_message["From"] = SENDER_EMAIL
    #         email_message["To"] = to
    #         email_message["Subject"] = subject
    #         email_message.attach(MIMEText(body, "plain"))


    #     ### Send Email

    #         server.sendmail(SENDER_EMAIL, to , email_message.as_string())
    #         # server.quit()
    #         logging.info(f"Sending Email to {to} with Subject: {subject}")
    # except Exception as e:
    #     print(f"Error sending email to {to}: {str(e)}")
    #     raise HTTPException(status_code=500 , detail="Failed to send Email")
    


    # async def consume_user_events():
    #     consumer = AIOKafkaConsumer(
    #         USER_TOPIC,
    #         bootstrap_servers=BOOT_STRAP_SERVER,
    #         group_id=KAFAK_CONSUMER_GROUP_ID_FOR_PRODUCT,
    #         auto_offset_reset="earliest",
    #     )
    #     await consumer.start()
    #     try:
    #         async for msg in consumer:
    #             event = json.loads(msg.value)
    #             if event["type"] == "UserCreated":
    #                 send_email(
    #                     to=event["email"],
    #                     subject="Welcome to Online Mart",
    #                     body=f"Dear {event['name']},\n\nWelcome to Online Mart! We're excited to have you on board.\n\nBest regards,\nThe Online Mart Team",
    #                 )
    #     finally:
    #         await consumer.stop()
        