# pyrefly: ignore [missing-import]
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.groq_api_key)


def chat_con_contexto(pregunta: str, contexto: str) -> str:
    """
    Envía una pregunta a Groq con contexto de datos reales de la BD.
    """
    respuesta = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un asistente empresarial inteligente para un sistema de control de asistencia. "
                    "Respondes preguntas sobre empleados, asistencias y horarios basándote ÚNICAMENTE "
                    "en los datos proporcionados. Responde siempre en español, de forma clara y concisa."
                )
            },
            {
                "role": "user",
                "content": f"Datos actuales del sistema:\n{contexto}\n\nPregunta: {pregunta}"
            }
        ],
        temperature=0.3,
        max_tokens=1024,
    )
    return respuesta.choices[0].message.content
