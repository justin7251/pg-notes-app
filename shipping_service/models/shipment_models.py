from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class ShipmentCreationRequest(BaseModel):
    note_id: UUID
    carrier: str = Field(..., description="e.g., 'ups' or 'royal_mail'")
    # Recipient details will be fetched from the 'notes' table based on note_id
    # Additional details like package weight/dimensions might be needed here
    # For a "note", these might be standardized or very small.
    # For now, keeping it simple.
    package_weight_kg: float = Field(0.1, description="Assumed weight for a note in kg")
    package_length_cm: float = Field(10, description="Assumed length for a note package in cm")
    package_width_cm: float = Field(5, description="Assumed width for a note package in cm")
    package_height_cm: float = Field(1, description="Assumed height for a note package in cm")


class ShipmentResponse(BaseModel):
    shipment_id: UUID
    note_id: UUID
    user_id: UUID
    carrier: str
    carrier_shipment_id: str | None = None
    tracking_number: str | None = None
    status: str
    label_image_url: str | None = None
    # label_data: str | None = None # Not exposing raw label data directly for now
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True # To allow creating from ORM objects directly

class ShipmentStatusResponse(BaseModel):
    shipment_id: UUID
    carrier: str
    tracking_number: str | None = None
    status: str
    # Could include more details from carrier if needed, like last known location, ETA
    last_known_event: str | None = None
    updated_at: datetime
