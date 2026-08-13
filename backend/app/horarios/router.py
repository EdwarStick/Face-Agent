"""
app/horarios/router.py — FastAPI router para el módulo de Horarios.

Endpoints:
  POST   /horarios/              → crear horario específico de empleado
  POST   /horarios/empresa       → crear/reemplazar horario global de empresa
  GET    /horarios/              → listar horarios (filtros: empleado_id, solo_globales)
  GET    /horarios/efectivo      → resolver horario efectivo para empleado + día
  GET    /horarios/{id}          → obtener horario por ID
  PUT    /horarios/{id}          → actualizar horario
  DELETE /horarios/{id}          → soft-delete (desactivar)
"""

import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.horarios.schemas import (
    HorarioCreate,
    HorarioGlobalCreate,
    HorarioUpdate,
    HorarioResponse,
    HorarioEfectivoResponse,
)
from app.horarios import service

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de creación
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=HorarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear horario específico de un empleado",
    description=(
        "Crea un horario para un empleado en un día concreto. "
        "Este horario tiene prioridad sobre el horario global de empresa."
    ),
)
def crear_horario(data: HorarioCreate, db: Session = Depends(get_db)):
    try:
        return service.crear_horario(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/empresa",
    response_model=HorarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear/reemplazar horario global de empresa",
    description=(
        "Establece el horario base de la empresa para un día de la semana. "
        "Aplica a todos los empleados que no tengan un horario específico para ese día. "
        "Si ya existe un global activo para ese día, lo desactiva (upsert)."
    ),
)
def crear_horario_empresa(
    data: HorarioGlobalCreate, db: Session = Depends(get_db)
):
    try:
        return service.crear_horario_global(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de consulta
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/efectivo",
    response_model=HorarioEfectivoResponse,
    summary="Resolver horario efectivo (herencia global/específico)",
    description=(
        "Dado un empleado y un día de la semana, retorna el horario que realmente aplica "
        "respetando la jerarquía: específico > global > sin_horario. "
        "El campo `origen` indica de dónde proviene el horario resuelto."
    ),
)
def horario_efectivo(
    empleado_id: uuid.UUID = Query(..., description="UUID del empleado"),
    dia_semana: int = Query(..., ge=0, le=6, description="0=Lunes … 6=Domingo"),
    db: Session = Depends(get_db),
):
    horario = service.resolver_horario_efectivo(db, empleado_id, dia_semana)

    if horario is None:
        return HorarioEfectivoResponse(
            empleado_id=empleado_id,
            dia_semana=dia_semana,
            hora_entrada=None,
            hora_salida=None,
            tolerancia_minutos=0,
            origen="sin_horario",
            horario_id=None,
        )

    return HorarioEfectivoResponse(
        empleado_id=empleado_id,
        dia_semana=dia_semana,
        hora_entrada=horario.hora_entrada,
        hora_salida=horario.hora_salida,
        tolerancia_minutos=horario.tolerancia_minutos,
        origen="global" if horario.es_global else "especifico",
        horario_id=horario.id,
    )


@router.get(
    "/",
    response_model=list[HorarioResponse],
    summary="Listar horarios",
)
def listar_horarios(
    empleado_id: uuid.UUID | None = Query(None, description="Filtrar por empleado"),
    solo_globales: bool = Query(False, description="Retornar solo horarios globales de empresa"),
    solo_activos: bool = Query(True, description="Incluir solo registros activos"),
    db: Session = Depends(get_db),
):
    return service.listar_horarios(
        db,
        empleado_id=empleado_id,
        solo_globales=solo_globales,
        solo_activos=solo_activos,
    )


@router.get(
    "/{horario_id}",
    response_model=HorarioResponse,
    summary="Obtener horario por ID",
)
def obtener_horario(horario_id: uuid.UUID, db: Session = Depends(get_db)):
    horario = service.obtener_horario(db, horario_id)
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado"
        )
    return horario


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de modificación
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/{horario_id}",
    response_model=HorarioResponse,
    summary="Actualizar horario",
)
def actualizar_horario(
    horario_id: uuid.UUID,
    data: HorarioUpdate,
    db: Session = Depends(get_db),
):
    try:
        horario = service.actualizar_horario(db, horario_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado"
        )
    return horario


@router.delete(
    "/{horario_id}",
    status_code=status.HTTP_200_OK,
    summary="Desactivar horario (soft-delete)",
    description=(
        "Marca el horario como inactivo. Si era el único horario específico del empleado "
        "para ese día, el sistema automáticamente comenzará a usar el horario global."
    ),
)
def eliminar_horario(horario_id: uuid.UUID, db: Session = Depends(get_db)):
    horario = service.eliminar_horario(db, horario_id)
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado"
        )
    tipo = "global" if horario.es_global else "específico"
    return {"mensaje": f"Horario {tipo} desactivado correctamente", "id": str(horario.id)}
