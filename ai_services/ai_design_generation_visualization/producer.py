"""
Kafka Producer — AI Design Visualization
=========================================
Provides an async generator dependency for FastAPI endpoints
that need to publish messages to Kafka topics.
"""

from __future__ import annotations

import os
from aiokafka import AIOKafkaProducer

import config


async def kafka_producer():
    """FastAPI dependency that yields a started Kafka producer."""

    producer = AIOKafkaProducer(bootstrap_servers=str(config.KAFKA_BOOTSTRAP_SERVER))
    await producer.start()
    try:
        yield producer
    finally:
        await producer.stop()
