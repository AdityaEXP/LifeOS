from arq.connections import RedisSettings
from services.pdf_processing import process_pdf_pipeline
from core.config import REDIS_HOST
from database.db import database

async def startup(ctx):

    print("WORKER STARTUP RUNNING")

    await database.connect()

    print(database.pool)

async def process_pdf_job(
    ctx,
    file_path,
    user_id,
    original_filename,
    stored_filename
):
    await process_pdf_pipeline(
        file_path=file_path,
        user_id=user_id,
        original_filename=original_filename,
        stored_filename=stored_filename
    )


class WorkerSettings:
    functions = [process_pdf_job]

    redis_settings = RedisSettings(
        host=REDIS_HOST,
        port=6379
    )

    on_startup = startup
