import uuid
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.rostro import Rostro
from app.models.empleado import Empleado
from app.services.face_service import generar_embedding
from app.rostros.schemas import RegistroRostroRequest


def registrar_rostro(db: Session, data: RegistroRostroRequest) -> Rostro:
    # Verificar que el empleado existe
    empleado = db.query(Empleado).filter(Empleado.id == data.empleado_id).first()
    if not empleado:
        raise ValueError(f"Empleado {data.empleado_id} no encontrado")

    # Generar embedding
    embedding = generar_embedding(data.imagen_base64)

    # Guardar en BD
    rostro = Rostro(
        empleado_id=data.empleado_id,
        vector_facial=embedding,
    )
    db.add(rostro)
    db.commit()
    db.refresh(rostro)
    return rostro


def listar_rostros_empleado(db: Session, empleado_id: uuid.UUID) -> list[Rostro]:
    return db.query(Rostro).filter(Rostro.empleado_id == empleado_id).all()
