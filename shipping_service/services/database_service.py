from sqlalchemy import create_engine, MetaData, Table, Column, String, DateTime, ForeignKey, Uuid, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import select, insert, update
from datetime import datetime
from uuid import UUID as PyUUID

from ..config import settings
from ..models.shipment_models import ShipmentResponse # For type hinting and ORM mode

DATABASE_URL = settings.database_url
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Reflect existing tables if needed, or define them explicitly
# For this service, we are primarily interested in 'notes' (to read address) and 'shipments' (to write/read)

notes_table = Table(
    "notes",
    metadata,
    Column("id", PG_UUID, primary_key=True),
    Column("user_id", PG_UUID, ForeignKey("users.id")),
    Column("title", String),
    Column("content", String),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("is_shippable", Boolean, default=False),
    Column("recipient_name", String, nullable=True),
    Column("recipient_address_line1", String, nullable=True),
    Column("recipient_address_line2", String, nullable=True),
    Column("recipient_city", String, nullable=True),
    Column("recipient_postal_code", String, nullable=True),
    Column("recipient_country", String, nullable=True),
    # Ensure all columns match the init.sql definition if reading from it
)

shipments_table = Table(
    "shipments",
    metadata,
    Column("id", PG_UUID, primary_key=True),
    Column("note_id", PG_UUID, ForeignKey("notes.id"), nullable=False),
    Column("user_id", PG_UUID, ForeignKey("users.id"), nullable=False),
    Column("carrier", String, nullable=False),
    Column("carrier_shipment_id", String, nullable=True),
    Column("tracking_number", String, nullable=True),
    Column("label_image_url", String, nullable=True),
    Column("label_data", String, nullable=True), # Assuming text for base64 encoded data
    Column("status", String, nullable=False, default="pending_creation"),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
)

async def get_note_details(note_id: PyUUID, user_id: PyUUID) -> dict | None:
    """Fetches note details if it belongs to the user and is shippable."""
    query = select(notes_table).where(notes_table.c.id == note_id).where(notes_table.c.user_id == user_id)
    with engine.connect() as connection:
        result = connection.execute(query).fetchone()
        if result and result.is_shippable:
            return result._asdict() if result else None
        return None # Not shippable or not found / not owned

async def create_shipment_in_db(
    note_id: PyUUID,
    user_id: PyUUID,
    carrier: str,
    status: str = "pending_creation"
) -> ShipmentResponse | None:
    """Creates a shipment record in the database."""
    query = insert(shipments_table).values(
        note_id=note_id,
        user_id=user_id,
        carrier=carrier,
        status=status,
        # id, created_at, updated_at will use defaults
    ).returning(shipments_table) # Return all columns after insert

    with engine.connect() as connection:
        try:
            result = connection.execute(query)
            connection.commit()
            row = result.fetchone()
            return ShipmentResponse.from_orm(row) if row else None
        except Exception as e:
            connection.rollback()
            print(f"Error creating shipment in DB: {e}") # Basic error logging
            return None


async def update_shipment_in_db(
    shipment_id: PyUUID,
    carrier_shipment_id: str | None = None,
    tracking_number: str | None = None,
    label_image_url: str | None = None,
    label_data: str | None = None, # For base64 encoded label
    status: str | None = None,
) -> ShipmentResponse | None:
    """Updates an existing shipment record."""
    values_to_update = {}
    if carrier_shipment_id is not None:
        values_to_update["carrier_shipment_id"] = carrier_shipment_id
    if tracking_number is not None:
        values_to_update["tracking_number"] = tracking_number
    if label_image_url is not None:
        values_to_update["label_image_url"] = label_image_url
    if label_data is not None:
        values_to_update["label_data"] = label_data
    if status is not None:
        values_to_update["status"] = status

    if not values_to_update:
        return None # Nothing to update

    values_to_update["updated_at"] = datetime.utcnow() # Manually set for SQLAlchemy Core

    query = update(shipments_table).where(shipments_table.c.id == shipment_id).values(**values_to_update).returning(shipments_table)

    with engine.connect() as connection:
        try:
            result = connection.execute(query)
            connection.commit()
            row = result.fetchone()
            return ShipmentResponse.from_orm(row) if row else None
        except Exception as e:
            connection.rollback()
            print(f"Error updating shipment in DB: {e}")
            return None

async def get_shipment_details_from_db(shipment_id: PyUUID, user_id: PyUUID) -> ShipmentResponse | None:
    """Fetches a shipment by its ID, ensuring it belongs to the user."""
    query = select(shipments_table).where(shipments_table.c.id == shipment_id).where(shipments_table.c.user_id == user_id)
    with engine.connect() as connection:
        result = connection.execute(query).fetchone()
        return ShipmentResponse.from_orm(result) if result else None

# Initialize tables in DB if they don't exist (for dev, migrations are better for prod)
# metadata.create_all(engine)
# Commented out: init.sql should be the source of truth for table creation.
# This service assumes tables exist.
