from fastapi import APIRouter, status

from app.api.deps import CompanyIdPath, CompanyRegistrationServiceDep
from app.schemas.company import CompanyRead, CompanyRegistrationCreate, CompanyStatusUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post(
    "/registrations",
    response_model=CompanyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create LLC registration application with multiple founders",
)
async def create_registration(
    payload: CompanyRegistrationCreate,
    service: CompanyRegistrationServiceDep,
) -> CompanyRead:
    company = await service.create_application(payload)
    return CompanyRead.model_validate(company)


@router.get(
    "/registrations/{company_id}",
    response_model=CompanyRead,
    summary="Get LLC registration application by id",
)
async def get_registration(
    company_id: CompanyIdPath,
    service: CompanyRegistrationServiceDep,
) -> CompanyRead:
    company = await service.get_application(company_id)
    return CompanyRead.model_validate(company)


@router.post(
    "/registrations/{company_id}/submit",
    response_model=CompanyRead,
    summary="Submit draft LLC registration application",
)
async def submit_registration(
    company_id: CompanyIdPath,
    service: CompanyRegistrationServiceDep,
) -> CompanyRead:
    company = await service.submit_application(company_id)
    return CompanyRead.model_validate(company)


@router.patch(
    "/registrations/{company_id}/status",
    response_model=CompanyRead,
    summary="Transition LLC registration status",
)
async def update_registration_status(
    company_id: CompanyIdPath,
    payload: CompanyStatusUpdate,
    service: CompanyRegistrationServiceDep,
) -> CompanyRead:
    company = await service.transition_status(company_id, payload.registration_status)
    return CompanyRead.model_validate(company)
