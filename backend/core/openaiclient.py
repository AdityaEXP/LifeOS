from core.config import OPENAI_API_KEY
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=OPENAI_API_KEY)
