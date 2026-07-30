import uuid
import httpx
import logging
import datetime
from typing import Dict, Any, Union
from pathlib import Path
import numpy as np

from app.agents.vision_agent import VisionAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.agents.planning_agent import PlanningAgent
from app.agents.report_agent import ReportAgent
from app.services.database_service import DatabaseService
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AgentOrchestrator:
    """
    Central orchestrator that coordinates the workflow across all specialized AI agents.
    """
    def __init__(self) -> None:
        self.vision_agent = VisionAgent()
        self.reasoning_agent = ReasoningAgent()
        self.planning_agent = PlanningAgent()
        self.report_agent = ReportAgent()
        self.db_service = DatabaseService()
        self.weather_agent_url = "http://localhost:8001/predict"

    async def process_incident(self, image_source: Union[str, Path, bytes, np.ndarray], user_id: str, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Executes the full multi-agent pipeline for a new incident report.
        """
        report_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"Starting orchestration pipeline for report {report_id} by user {user_id}")
        
        # 1. Vision Agent
        logger.info("-> Calling Vision Agent")
        vision_result = self.vision_agent.analyze(image_source)
        
        highest_severity = vision_result.get("summary", {}).get("highest_severity", 1)
        main_damage = "Pothole" if highest_severity > 0 else "None Detected"
        confidence = 0.95 
        
        if vision_result.get("detections"):
            main_damage = vision_result["detections"][0].get("damage", "Pothole")
            confidence = vision_result["detections"][0].get("confidence", 0.95)

        # 2. Weather Agent (HTTP Call)
        logger.info("-> Calling Weather Agent")
        weather_result = await self._call_weather_agent(image_source)
        
        # 3. Memory Agent (Stub)
        logger.info("-> Calling Memory Agent (Stub)")
        history_result = self._call_memory_agent_stub(latitude, longitude)
        
        # 4. Gemma Reasoning Agent
        logger.info("-> Calling Gemma Reasoning Agent")
        reasoning_input = {
            "damage": main_damage,
            "confidence": confidence,
            "severity": highest_severity,
            "weather": weather_result.get("weather", "Unknown"),
            "weather_confidence": weather_result.get("confidence", 0.0),
            "gps": {
                "lat": latitude,
                "lon": longitude
            },
            "history": history_result
        }
        reasoning_result = self.reasoning_agent.analyze(reasoning_input)
        
        # 5. Planning Agent
        logger.info("-> Calling Planning Agent")
        planning_input = {
            "risk": reasoning_result.get("risk", "Unknown"),
            "weather": weather_result.get("weather", "Unknown"),
            "history": history_result
        }
        planning_result = self.planning_agent.analyze(planning_input)
        
        # 6. Report Agent
        logger.info("-> Calling Report Agent")
        report_input = {
            "vision": vision_result,
            "weather": weather_result,
            "reasoning": reasoning_result,
            "planning": planning_result
        }
        report_text_result = self.report_agent.analyze(report_input)
        
        # Assemble Final Report mapping to our Pydantic Schema structure
        final_report = {
            "report_id": report_id,
            "timestamp": timestamp,
            "user_id": user_id,
            "image_url": "mock_url_until_firebase_storage_implemented",
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "vision": {
                "damage": main_damage,
                "severity": highest_severity,
                "confidence": confidence
            },
            "weather": {
                "condition": weather_result.get("weather", "Unknown"),
                "confidence": weather_result.get("confidence", 0.0)
            },
            "reasoning": {
                "risk": reasoning_result.get("risk", "Unknown"),
                "priority": reasoning_result.get("priority", "Unknown")
            },
            "planning": planning_result,
            "report": report_text_result,
            "status": "Pending"
        }
        
        # 7. Storage
        logger.info("-> Saving final report to Firestore")
        self.db_service.save_report(final_report)
        
        logger.info(f"Orchestration complete for report {report_id}")
        return final_report
        
    async def _call_weather_agent(self, image_source: Union[str, Path, bytes, np.ndarray]) -> Dict[str, Any]:
        """Calls the external Weather Agent microservice."""
        try:
            file_bytes = b"mock_image_data"
            if isinstance(image_source, (str, Path)):
                if Path(image_source).exists():
                    with open(image_source, "rb") as f:
                        file_bytes = f.read()

            async with httpx.AsyncClient() as client:
                files = {"file": ("image.jpg", file_bytes, "image/jpeg")}
                response = await client.post(self.weather_agent_url, files=files, timeout=5.0)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.warning(f"Weather Agent HTTP call failed ({e}). Falling back to mock data.")
            return {"weather": "Clear", "confidence": 0.85}

    def _call_memory_agent_stub(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Stub for the Memory Agent."""
        try:
            nearby_reports = self.db_service.get_reports_by_location(latitude, longitude, radius_meters=500)
            return {
                "previous_reports": len(nearby_reports),
                "last_repair": "2025-10-01" if nearby_reports else None
            }
        except Exception as e:
            logger.warning(f"Memory Agent stub failed: {e}")
            return {"previous_reports": 0, "last_repair": None}
