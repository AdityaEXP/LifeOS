from fastapi import UploadFile, File, HTTPException, Depends
from fastapi.routing import APIRouter
import os
import uuid
import aiofiles

from services.auth import get_current_user

from services.pdf_processing import process_pdf_pipeline, get_all_files_for_user

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    content = await file.read()

    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds the {(round(MAX_PDF_SIZE / (1024 * 1024), 2))} MB limit")


    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    await process_pdf_pipeline(file_path, user_id=current_user["id"], original_filename=file.filename, stored_filename=unique_filename)

    return {
        "message": "PDF uploaded successfully",
    }

@router.get("/")
async def list_files(current_user: dict = Depends(get_current_user)):
    files = await get_all_files_for_user(current_user["id"])
    return {"files": files}