from fastapi import APIRouter

from app.api.v1.endpoints import chat, companies

api_router = APIRouter()
api_router.include_router(companies.router)
api_router.include_router(chat.router)
