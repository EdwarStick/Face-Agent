import uuid
from fastapi.testclient import TestClient

def test_horarios_crud(client: TestClient) -> None:
    # 1. Create Empleado first
    codigo = f"TEST-HOR-{uuid.uuid4()}"[:50]
    correo = f"test-hor-{uuid.uuid4()}@example.com"
    payload_emp = {
        "codigo_empleado": codigo,
        "prim_nombre": "Carlos",
        "prim_apellido": "Gomez",
        "correo": correo,
        "telefono": "555-0200",
        "cargo": "Supervisor",
        "area": "Operaciones",
    }
    
    resp_emp = client.post("/api/v1/empleados/", json=payload_emp)
    assert resp_emp.status_code == 201
    emp_data = resp_emp.json()
    empleado_id = emp_data["id"]

    # 2. Create Horario (should pass with time/string serialization)
    payload_hor = {
        "empleado_id": empleado_id,
        "dia_semana": 0,  # Lunes
        "hora_entrada": "08:00:00",
        "hora_salida": "17:00:00"
    }
    
    resp_hor = client.post("/api/v1/horarios/", json=payload_hor)
    assert resp_hor.status_code == 201
    hor_data = resp_hor.json()
    assert "id" in hor_data
    assert hor_data["empleado_id"] == empleado_id
    assert hor_data["dia_semana"] == 0
    assert "08:00:00" in hor_data["hora_entrada"]
    assert "17:00:00" in hor_data["hora_salida"]
    
    horario_id = hor_data["id"]

    # 3. Update Horario
    payload_update = {
        "hora_entrada": "09:00:00"
    }
    resp_update = client.put(f"/api/v1/horarios/{horario_id}", json=payload_update)
    assert resp_update.status_code == 200
    update_data = resp_update.json()
    assert "09:00:00" in update_data["hora_entrada"]

    # 4. Clean up / Soft-delete employee
    resp_del_emp = client.delete(f"/api/v1/empleados/{empleado_id}")
    assert resp_del_emp.status_code == 200
