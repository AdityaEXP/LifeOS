from fastapi import FastAPI
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.upload import router as files_router
from routes.query import router as query_router
from routes.subjects import router as subjects_router
from fastapi.middleware.cors import CORSMiddleware
from database.reddis_core import init_redis
import fastapi_swagger_dark as fsd
from database.db import database

app = FastAPI(
    docs_url=None
)
fsd.install(app)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(files_router)
app.include_router(query_router)
app.include_router(subjects_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "checking!!"}

@app.on_event("startup")
async def startup():
    await database.connect()
    await database.init_db()
    await init_redis()
    print("database and reddis along with rq connected!")


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
    print("Database disconnected")
