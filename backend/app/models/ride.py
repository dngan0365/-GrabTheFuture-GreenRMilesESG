import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ride(Base):
    __tablename__ = "rides"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    origin_name: Mapped[str] = mapped_column(String, nullable=False)
    destination_name: Mapped[str] = mapped_column(String, nullable=False)
    distance_km: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)

    vehicle_profile_id: Mapped[str] = mapped_column(ForeignKey("vehicle_profiles.id"), nullable=False)
    baseline_profile_id: Mapped[str] = mapped_column(ForeignKey("vehicle_profiles.id"), nullable=False)

    purpose: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="BOOKED")

    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    price_vnd: Mapped[int] = mapped_column(Integer, default=0)
    actual_price_vnd: Mapped[int | None] = mapped_column(Integer, nullable=True)

    baseline_co2_kg: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    actual_co2_kg: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    co2_saved_kg: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    fuel_saved_liters: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    tree_equivalent: Mapped[float] = mapped_column(Numeric(12, 3), default=0)

    green_score_added: Mapped[int] = mapped_column(Integer, default=0)
    green_points_added: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    user: Mapped["User"] = relationship(back_populates="rides")  # type: ignore
