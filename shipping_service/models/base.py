from pydantic import BaseModel

class BaseResponseModel(BaseModel):
    pass

class ErrorDetail(BaseModel):
    message: str
    field: str | None = None

class ErrorResponse(BaseModel):
    detail: str | list[ErrorDetail]
