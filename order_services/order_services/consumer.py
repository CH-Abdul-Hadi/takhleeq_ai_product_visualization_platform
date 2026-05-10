import asyncio
import json
import logging
import os

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError
from sqlmodel import Session

from . import setting
from .database import Order, engine

logging.basicConfig(level=logging.INFO)


async def consume_messages() -> AIOKafkaConsumer:
    consumer = AIOKafkaConsumer(
        setting.KAFKA_ORDER_TOPIC,
        bootstrap_servers=setting.KAFKA_BOOTSTRAP_SERVER,
        group_id=setting.KAFKA_CONSUMER_GROUP_ID_FOR_ORDER,
        auto_offset_reset="earliest",
    )

    while True:
        try:
            await consumer.start()
            logging.info("Consumer Started....")
            break
        except KafkaConnectionError as e:
            logging.info("Consumer starting failed , Retry in 5 seconds...")
            await asyncio.sleep(5)

    try:
        async for messages in consumer:
            consume = messages.value
            print("consumer_messages", consume)
    finally:
        await consumer.stop()
