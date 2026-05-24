from fastapi import FastAPI, HTTPException, Depends
from fastapi.routing import APIRouter
from services.auth import get_current_user
from schemas.user import MeResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=MeResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return MeResponse(**current_user)