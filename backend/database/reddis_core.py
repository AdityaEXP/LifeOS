import redis.asyncio as redis
from services.pdf_processing import process_pdf_pipeline
from core.config import REDIS_HOST


redis_client = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    decode_responses=True
)


from arq import create_pool
from arq.connections import RedisSettings

redis_pool = None

async def init_redis():

    global redis_pool

    redis_pool = await create_pool(
        RedisSettings(
            host=REDIS_HOST,
            port=6379
        )
    )

