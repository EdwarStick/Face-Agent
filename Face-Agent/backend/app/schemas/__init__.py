"""
app/schemas — Package init
Centralised re-exports for all Pydantic schemas.
Add new schema imports here as features are developed.
"""

from app.schemas.health import HealthResponse  # noqa: F401

# Future schemas — uncomment as features are implemented:
# from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
# from app.schemas.attendance import AttendanceCreate, AttendanceRead
# from app.schemas.report import ReportRead

__all__ = ["HealthResponse"]
