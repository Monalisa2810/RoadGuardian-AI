from pathlib import Path
from typing import Optional
from ultralytics import YOLO
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class ModelLoader:
    """
    Singleton class responsible for loading and providing access to AI models.
    Models are loaded lazily upon first request to optimize startup time and memory.
    """
    _instance: Optional['ModelLoader'] = None

    def __new__(cls) -> 'ModelLoader':
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._pothole_model = None
            logger.info("Initialized ModelLoader singleton.")
        return cls._instance

    def get_pothole_model(self) -> YOLO:
        """
        Lazily loads and returns the YOLOv8 pothole detection model.
        
        Returns:
            YOLO: The loaded YOLO model instance.
            
        Raises:
            FileNotFoundError: If the model weights file does not exist.
            RuntimeError: If the model fails to load.
        """
        if self._pothole_model is None:
            # Resolve path relative to this file: backend/app/models/pothole/best.pt
            base_dir = Path(__file__).resolve().parent
            model_path = base_dir / "pothole" / "best.pt"
            
            if not model_path.exists():
                logger.warning(f"Pothole model weights not found at: {model_path}. Running in MOCK mode.")
                return None
                
            try:
                logger.info(f"Loading YOLOv8 pothole model from {model_path}...")
                self._pothole_model = YOLO(str(model_path))
                logger.info("Successfully loaded YOLOv8 pothole model.")
            except Exception as e:
                logger.error(f"Failed to load YOLOv8 model: {e}")
                raise RuntimeError(f"Error loading YOLO model: {e}") from e
                
        return self._pothole_model
