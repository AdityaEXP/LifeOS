from fastapi.routing import APIRouter
from fastapi import Depends
from services.auth import get_current_user
from schemas.query import QueryRequest

from services.query import query_documents


router = APIRouter(prefix="/query", tags=["query"])

@router.post("/")
async def query_endpoint(query: QueryRequest, current_user: dict = Depends(get_current_user)):
    q = query.query
    results = await query_documents(q, current_user["id"])
    return {"answer": results}