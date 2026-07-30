import numpy as np
from typing import List, Dict, Any, Union
from pathlib import Path
from app.models.loaders import ModelLoader
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class YOLOService:
    """
    Service responsible for handling YOLO inference on images to detect potholes.
    """
    
    def __init__(self) -> None:
        """Initializes the service and the model loader."""
        self.model_loader = ModelLoader()
        
    def analyze_image(self, image: Union[str, Path, np.ndarray]) -> List[Dict[str, Any]]:
        """
        Perform YOLO inference to detect potholes in the provided image.
        
        Args:
            image (Union[str, Path, np.ndarray]): Path to the image file or a NumPy image array.
            
        Returns:
            List[Dict[str, Any]]: A list of detections, where each detection is a dictionary
                                  containing class_name, confidence, bounding_box, bounding_box_area,
                                  normalized_area, and severity_score.
                                  
        Raises:
            Exception: If inference fails or image cannot be processed.
        """
        try:
            logger.debug("Requesting pothole model from loader...")
            model = self.model_loader.get_pothole_model()
            
            logger.info("Running YOLO inference...")
            # Predict returns a list of Results objects (one per image)
            # Set conf=0.15 to ensure we catch all potholes the base model detects
            results = model.predict(source=image, conf=0.15, verbose=False)
            
            if not results:
                logger.warning("YOLO returned no results object.")
                return []
                
            result = results[0]
            detections = []
            
            # Image dimensions (height, width)
            orig_shape = result.orig_shape
            img_area = orig_shape[0] * orig_shape[1]
            
            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                logger.info("No potholes detected in the image.")
                return []
                
            for box in boxes:
                # Convert tensor values to standard Python types
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                class_name = model.names[cls_id] if model.names else "Pothole"
                
                # Bounding box coordinates [x1, y1, x2, y2]
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                
                # Calculate areas
                width = xyxy[2] - xyxy[0]
                height = xyxy[3] - xyxy[1]
                bbox_area = width * height
                
                normalized_area = bbox_area / img_area if img_area > 0 else 0
                
                # Severity score logic: Scale normalized area to 1-10.
                # A pothole taking up even 2% of a high-res dashcam image is massive in real life.
                # Cap at 10, min at 1.
                raw_severity = (normalized_area / 0.02) * 10
                severity_score = min(max(int(round(raw_severity)), 1), 10)
                
                detection = {
                    "class_name": class_name,
                    "confidence": round(conf, 4),
                    "bounding_box": [round(c, 2) for c in xyxy],
                    "bounding_box_area": round(bbox_area, 2),
                    "normalized_area": round(normalized_area, 4),
                    "severity_score": severity_score
                }
                detections.append(detection)
                
            logger.info(f"Detected {len(detections)} pothole(s).")
            return detections
            
        except Exception as e:
            logger.error(f"Error during YOLO inference: {e}")
            raise
