from pydantic import BaseModel

class SubjectCreateRequest(BaseModel):
    name: str

class AssignFileToSubjectRequest(BaseModel):
    subject_id: int
    file_id: int

class DeleteSubjectRequest(BaseModel):
    subject_id: int

class RemoveFileFromSubjectRequest(BaseModel):
    subject_id: int
    file_id: int