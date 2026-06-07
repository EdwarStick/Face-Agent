import uuid
from fastapi.testclient import TestClient


def test_empleados_crud(client: TestClient) -> None:
    # 1. Create Empleado (testing with missing second names to verify empty string defaults)
    codigo = f"TEST-{uuid.uuid4()}"[:50]
    correo = f"test-{uuid.uuid4()}@example.com"
    payload = {
        "codigo_empleado": codigo,
        "prim_nombre": "Juan",
        "prim_apellido": "Perez",
        "correo": correo,
        "telefono": "555-0199",
        "cargo": "Desarrollador",
        "area": "Tecnologia",
    }
    
    response = client.post("/api/v1/empleados/", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert "id" in data
    assert data["codigo_empleado"] == codigo
    assert data["prim_nombre"] == "Juan"
    assert data["seg_nombres"] == ""  # Verified default
    assert data["prim_apellido"] == "Perez"
    assert data["seg_apellido"] == ""  # Verified default
    assert data["correo"] == correo
    assert data["activo"] is True
    
    empleado_id = data["id"]
    
    # 2. Get Empleado by UUID
    response = client.get(f"/api/v1/empleados/{empleado_id}")
    assert response.status_code == 200
    assert response.json()["id"] == empleado_id

    # 3. Update Empleado (adding second name and updating first name)
    update_payload = {
        "prim_nombre": "Juan Carlos",
        "seg_nombres": "Carlos",
    }
    response = client.put(f"/api/v1/empleados/{empleado_id}", json=update_payload)
    assert response.status_code == 200
    
    updated_data = response.json()
    assert updated_data["prim_nombre"] == "Juan Carlos"
    assert updated_data["seg_nombres"] == "Carlos"

    # 4. List Empleados (confirming new employee is in active list)
    response = client.get("/api/v1/empleados/")
    assert response.status_code == 200
    active_employees = response.json()
    assert any(emp["id"] == empleado_id for emp in active_employees)

    # 5. Soft Delete Empleado
    response = client.delete(f"/api/v1/empleados/{empleado_id}")
    assert response.status_code == 200
    assert response.json() == {"mensaje": "Empleado desactivado correctamente"}

    # 6. Verify employee is no longer in active list but still retrievable with active=False
    response = client.get("/api/v1/empleados/")
    assert response.status_code == 200
    active_employees_after = response.json()
    assert not any(emp["id"] == empleado_id for emp in active_employees_after)

    response = client.get(f"/api/v1/empleados/{empleado_id}")
    assert response.status_code == 200
    assert response.json()["activo"] is False
