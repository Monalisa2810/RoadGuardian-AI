from typing import Dict, Any, Union
from pathlib import Path
import numpy as np
from app.services.yolo_service import YOLOService
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class VisionAgent:
    """
    Agent responsible for visual detection of road damages.
    Coordinates with the YOLOService and structures the output.
    """
    
    def __init__(self) -> None:
        self.yolo_service = YOLOService()
        logger.info("VisionAgent initialized.")

    def analyze(self, image_source: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """
        Analyze an image for potholes and return a standardized structured report.
        
        Args:
            image_source (Union[str, Path, np.ndarray]): Path to image or NumPy array.
            
        Returns:
            Dict[str, Any]: Structured output containing detections and summary.
        """
        logger.info("VisionAgent starting analysis.")
        
        try:
            # Get raw detections from the service
            raw_detections = self.yolo_service.analyze_image(image_source)
            
            # Format detections for the standardized schema
            formatted_detections = []
            for d in raw_detections:
                formatted_detections.append({
                    "damage": d.get("class_name", "Pothole"),
                    "severity": d.get("severity_score", 1),
                    "confidence": d.get("confidence", 0.0),
                    "bounding_box": d.get("bounding_box", [])
                })
                
            # Calculate summary statistics
            count = len(formatted_detections)
            highest_severity = max([d["severity"] for d in formatted_detections], default=0)
            avg_severity = sum(d["severity"] for d in formatted_detections) / count if count > 0 else 0
            
            result = {
                "agent": "VisionAgent",
                "detections": formatted_detections,
                "summary": {
                    "count": count,
                    "highest_severity": highest_severity,
                    "average_severity": round(avg_severity, 2)
                }
            }
            
            logger.info(f"VisionAgent analysis complete. Found {count} items.")
            return result
            
        except Exception as e:
            logger.error(f"VisionAgent failed during analysis: {e}")
            raise
