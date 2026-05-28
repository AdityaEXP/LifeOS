from fastapi import Depends, HTTPException
from fastapi.routing import APIRouter
from services.auth import get_current_user
from services.subjects import (
    create_subject as create_subject_record,
    get_all_subjects_for_user,
    assign_file_to_subject as assign_file_to_subject_record,
    delete_subject as delete_subject_record,
    remove_file_from_subject as remove_file_from_subject_record,
)
from schemas.subjects import SubjectCreateRequest, AssignFileToSubjectRequest, DeleteSubjectRequest, RemoveFileFromSubjectRequest

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/")
async def get_all_subjects(current_user: dict = Depends(get_current_user)):
    all_subjects = await get_all_subjects_for_user(current_user["id"])
    return {"subjects": all_subjects}

@router.post("/create")
async def create_new_subject(subject_data: SubjectCreateRequest, current_user: dict = Depends(get_current_user)):
    subject_id = await create_subject_record(current_user["id"], subject_data.name)
    return {"id": subject_id, "name": subject_data.name}

@router.post("/assign_file")
async def assign_file(assign_data: AssignFileToSubjectRequest, current_user: dict = Depends(get_current_user)):
    try:
        await assign_file_to_subject_record(
            current_user["id"],
            assign_data.subject_id,
            assign_data.file_id
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {"message": "File assigned to subject successfully"}

@router.delete("/")
async def delete_subject_route(delete_data: DeleteSubjectRequest, current_user: dict = Depends(get_current_user)):
    try:
        await delete_subject_record(current_user["id"], delete_data.subject_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {"message": "Subject deleted successfully"}

@router.delete("/remove_file")
async def remove_file_from_subject_route(remove_data: RemoveFileFromSubjectRequest, current_user: dict = Depends(get_current_user)):
    try:
        await remove_file_from_subject_record(current_user["id"], remove_data.subject_id, remove_data.file_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {"message": "File removed from subject successfully"}
                                   