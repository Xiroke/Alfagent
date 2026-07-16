from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import Response

from app.api.deps import CompanyIdPath, CompanyRegistrationServiceDep, LLMDep
from app.application.services.document_text_extractor import DocumentTextExtractor
from app.application.services.protocol_document import ProtocolDocumentService
from app.application.services.wizard_prefill import WizardPrefillService
from app.core.config import get_settings
from app.core.exceptions import ValidationAppError
from app.schemas.company import CompanyRead, CompanyRegistrationCreate, CompanyStatusUpdate
from app.schemas.protocol import ProtocolGenerateRequest
from app.schemas.wizard_prefill import WizardPrefillResponse

router = APIRouter(prefix="/companies", tags=["companies"])

_text_extractor = DocumentTextExtractor()
_protocol_service = ProtocolDocumentService()


def get_wizard_prefill_service(client: LLMDep) -> WizardPrefillService:
    return WizardPrefillService(client)


WizardPrefillServiceDep = Annotated[WizardPrefillService, Depends(get_wizard_prefill_service)]


@router.post(
    "/generate-protocol",
    summary="Generate founders meeting protocol (.docx) from registration draft",
    response_class=Response,
)
async def generate_protocol(payload: ProtocolGenerateRequest) -> Response:
    content = _protocol_service.build_docx_bytes(
        company=payload.company,
        founders=payload.founders,
        address=payload.address,
        tax=payload.tax,
    )
    # HTTP headers must be latin-1: keep ASCII fallback + RFC 5987 UTF-8 name.
    short = (payload.company.short_name or payload.company.name or "ooo").strip()
    ascii_stem = "".join(ch if ch.isascii() and (ch.isalnum() or ch in "-_") else "_" for ch in short)
    ascii_stem = ascii_stem.strip("_")[:40] or "ooo"
    display_stem = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in short).strip()[:40] or ascii_stem
    ascii_name = f"protokol_uchreditelej_{ascii_stem}.docx"
    utf8_name = f"protokol_uchreditelej_{display_stem}.docx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_name}"; '
                f"filename*=UTF-8''{quote(utf8_name)}"
            ),
        },
    )


@router.post(
    "/prefill-from-document",
    response_model=WizardPrefillResponse,
    summary="Extract company data from uploaded document (txt/docx/pdf/xlsx)",
)
async def prefill_registration_from_document(
    service: WizardPrefillServiceDep,
    file: UploadFile = File(..., description="Company info document"),
) -> WizardPrefillResponse:
    settings = get_settings()
    filename = file.filename or "document"
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise ValidationAppError(
            f"Файл слишком большой (макс. {settings.max_upload_bytes // (1024 * 1024)} МБ)",
        )

    text = _text_extractor.extract(filename, content)
    return await service.prefill_from_text(text, source_filename=filename)


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

