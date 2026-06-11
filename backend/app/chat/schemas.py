# pyrefly: ignore [missing-import]
from pydantic import BaseModel


class ChatRequest(BaseModel):
    pregunta: str


class ChatResponse(BaseModel):
    respuesta: str
    pregunta: str
