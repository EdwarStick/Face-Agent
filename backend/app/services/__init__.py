"""
app/services — Business Logic Layer
=====================================
Each service encapsulates a domain's business rules and
orchestrates between the DB layer and external integrations.

Planned services (one file per domain):
    - employee_service.py      : CRUD for employee records
    - attendance_service.py    : Check-in / check-out logic, tardiness calc
    - face_service.py          : Embedding generation, verification (DeepFace)
    - report_service.py        : Report aggregation and export
    - azure_ai_service.py      : Azure Cognitive Services integration
"""
