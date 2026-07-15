from enum import StrEnum


class UserRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    APPLICANT = "applicant"


class CompanyRegistrationStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    DOCUMENTS_REVIEW = "documents_review"
    PENDING_BANK = "pending_bank"
    REGISTERED = "registered"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class TaxRegime(StrEnum):
    OSN = "osn"
    USN = "usn"
    AUSN = "ausn"


class AddressType(StrEnum):
    RENTAL = "rental"
    HOME = "home"
