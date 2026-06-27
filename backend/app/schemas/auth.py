from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class LogoutRequest(BaseModel):
    refreshToken: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    companyId: str
    companyName: str | None = None
    department: str | None = None

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    accessToken: str
    refreshToken: str


class LoginResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: UserOut