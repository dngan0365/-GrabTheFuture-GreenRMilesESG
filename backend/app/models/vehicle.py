from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VehicleProfile(Base):
    __tablename__ = "vehicle_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    vehicle_class: Mapped[str] = mapped_column(String, nullable=False)
    powertrain: Mapped[str] = mapped_column(String, nullable=False)
    energy_usage_value: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    energy_usage_unit: Mapped[str] = mapped_column(String, nullable=False)
    co2_kg_per_km: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    baseline_profile_id: Mapped[str | None] = mapped_column(ForeignKey("vehicle_profiles.id"), nullable=True)
    source_note: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
