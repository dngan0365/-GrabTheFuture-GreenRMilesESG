from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User, Company, Department
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.schemas.auth import LoginRequest


async def login(db: AsyncSession, payload: LoginRequest) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid email or password"},
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Account is inactive"},
        )

    # Fetch company name
    company_result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = company_result.scalar_one_or_none()

    # Fetch department name
    dept_name = None
    if user.department_id:
        dept_result = await db.execute(select(Department).where(Department.id == user.department_id))
        dept = dept_result.scalar_one_or_none()
        dept_name = dept.name if dept else None

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "companyId": str(user.company_id),
            "companyName": company.name if company else None,
            "department": dept_name,
        },
    }


async def get_me(db: AsyncSession, user: User) -> dict:
    company_result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = company_result.scalar_one_or_none()

    dept_name = None
    if user.department_id:
        dept_result = await db.execute(select(Department).where(Department.id == user.department_id))
        dept = dept_result.scalar_one_or_none()
        dept_name = dept.name if dept else None

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "companyId": str(user.company_id),
        "companyName": company.name if company else None,
        "department": dept_name,
    }
