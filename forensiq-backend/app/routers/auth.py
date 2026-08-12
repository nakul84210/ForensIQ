from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.database import get_db
from fastapi import Depends

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(data: RegisterRequest):
    db = get_db()
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = get_password_hash(data.password)
    await db.users.insert_one({"name": data.name, "email": data.email, "password": hashed})
    token = create_access_token({"sub": data.email})
    return {"access_token": token, "token_type": "bearer", "name": data.name, "email": data.email}

@router.post("/login")
async def login(data: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": data.email})
    return {"access_token": token, "token_type": "bearer", "name": user["name"], "email": user["email"]}

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
