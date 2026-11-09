from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MachineCreateRequest(BaseModel):
    machine_identifier: str = Field(..., min_length=2, max_length=100, description="Unique asset/serial identifier (e.g. FAN-BAY-01)")
    machine_name: str = Field(..., min_length=2, max_length=255, description="Human readable machine name")
    machine_type: str = Field(..., description="Machine type: fan, pump, valve, slide_rail")
    description: Optional[str] = None

class MachineUpdateRequest(BaseModel):
    machine_name: Optional[str] = None
    machine_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class MachineResponse(BaseModel):
    id: str
    user_id: str
    machine_identifier: str
    machine_name: str
    machine_type: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    total_analyses: Optional[int] = 0
    latest_score: Optional[float] = None

    class Config:
        from_attributes = True

class MachineListResponse(BaseModel):
    items: List[MachineResponse]
    total: int
