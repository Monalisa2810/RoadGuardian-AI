from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Location(BaseModel):
    latitude: float
    longitude: float

class VisionData(BaseModel):
    damage: str
    severity: int = Field(ge=1, le=10)
    confidence: float

class WeatherData(BaseModel):
    condition: str
    confidence: float

class ReasoningData(BaseModel):
    risk: str
    priority: str

class Report(BaseModel):
    """
    The shared document structure for reports. 
    Each agent contributes to its specific section rather than overwriting shared fields.
    """
    report_id: str
    timestamp: str
    user_id: str
    image_url: str
    location: Location
    
    # Optional fields populated by agents as the report progresses through the orchestrator
    vision: Optional[VisionData] = None
    weather: Optional[WeatherData] = None
    reasoning: Optional[ReasoningData] = None
    
    status: str = "Pending"
