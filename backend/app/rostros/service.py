import uuid
from pathlib import Path
# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func as sqlfunc
# pyrefly: ignore [missing-import]
from loguru import logger
from app.models.rostro import Rostro
from app.models.empleado import Empleado
from app.services.face_service import generar_embedding, imagen_base64_a_array
from app.rostros.schemas import RegistroRostroRequest

MAX_TOMAS = 4
DIR_UPLOADS = Path("uploads") / "rostros"


def _asegurar_directorio() -> None:
    DIR_UPLOADS.mkdir(parents=True, exist_ok=True)


def _guardar_imagen(imagen_base64: str) -> str:
    """Decodifica, guarda en disco y retorna la ruta del archivo."""
    _asegurar_directorio()
    nombre = f"{uuid.uuid4()}.jpg"
    ruta = DIR_UPLOADS / nombre
    img_array = imagen_base64_a_array(imagen_base64)
    cv2.imwrite(str(ruta), img_array)
    logger.info(f"Imagen guardada: {ruta}")
    return str(ruta)


def registrar_rostro(db: Session, data: RegistroRostroRequest) -> dict:
    # Verificar que el empleado existe
    empleado = db.query(Empleado).filter(Empleado.id == data.empleado_id).first()
    if not empleado:
        raise ValueError(f"Empleado {data.empleado_id} no encontrado")

    # Contar cuántas tomas tiene ya registradas
    conteo_actual = db.query(sqlfunc.count(Rostro.id)).filter(
        Rostro.empleado_id == data.empleado_id
    ).scalar() or 0

    if conteo_actual >= MAX_TOMAS:
        return {
            "status": "completed",
            "message": f"Registro biométrico completado con éxito ({MAX_TOMAS} de {MAX_TOMAS} tomas guardadas)",
            "total": MAX_TOMAS,
        }

    # Procesar y guardar la nueva toma
    ruta = _guardar_imagen(data.imagen_base64)
    embedding = generar_embedding(data.imagen_base64)
    rostro = Rostro(
        empleado_id=data.empleado_id,
        ruta_imagen=ruta,
        vector_facial=embedding,
    )
    db.add(rostro)
    db.commit()
    db.refresh(rostro)

    foto_numero = conteo_actual + 1  # 1‑based, ej: 0 existentes → foto 1

    if foto_numero < MAX_TOMAS:
        numero_siguiente = conteo_actual + 2
        return {
            "status": "success",
            "message": (
                f"Foto {foto_numero} guardada. "
                f"Por favor, tómate la Foto {numero_siguiente} "
                "(Cambia el ángulo o usa gafas/accesorios)"
            ),
            "total": foto_numero,
        }

    return {
        "status": "completed",
        "message": f"Registro biométrico completado con éxito ({MAX_TOMAS} de {MAX_TOMAS} tomas guardadas)",
        "total": MAX_TOMAS,
    }


def listar_rostros_empleado(db: Session, empleado_id: uuid.UUID) -> list[Rostro]:
    return db.query(Rostro).filter(Rostro.empleado_id == empleado_id).all()


def contar_rostros(db: Session) -> int:
    return db.query(sqlfunc.count(Rostro.id)).scalar() or 0
