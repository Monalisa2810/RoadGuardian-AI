import os
import logging
import numpy as np
from pathlib import Path
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Try to import tensorflow, but don't crash if it's missing (for placeholder/mocking)
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logger.warning("TensorFlow is not installed. WeatherPredictor will run in mock mode.")

class WeatherPredictor:
    """
    Predicts weather conditions from images using a Keras model.
    Falls back to a mock mode if the model is absent or invalid.
    """
    def __init__(self):
        self.model = None
        self.labels = []
        self.base_dir = Path(__file__).resolve().parent
        
        self._load_labels()
        self._load_model()
        
    def _load_labels(self):
        labels_path = self.base_dir / "labels.txt"
        if labels_path.exists():
            with open(labels_path, "r") as f:
                self.labels = [line.strip() for line in f.readlines() if line.strip()]
        else:
            self.labels = ["Clear", "Rainy", "Snowy", "Foggy"]
            logger.warning(f"labels.txt not found. Using defaults: {self.labels}")
            
    def _load_model(self):
        if not TF_AVAILABLE:
            return
            
        model_path = self.base_dir / "weather.keras"
        if not model_path.exists():
            logger.warning(f"Model file not found at {model_path}. Running in mock mode.")
            return
            
        try:
            # We assume it's a valid Keras file. 
            # If it's a dummy placeholder file (e.g. less than 1KB), don't load it.
            if os.path.getsize(model_path) > 1024:
                self.model = tf.keras.models.load_model(str(model_path))
                logger.info("Successfully loaded weather.keras model.")
            else:
                logger.warning("weather.keras appears to be an empty placeholder. Running in mock mode.")
        except Exception as e:
            logger.error(f"Failed to load Keras model: {e}")
            
    def predict(self, image_bytes: bytes) -> dict:
        """
        Predict the weather condition from an image.
        
        Args:
            image_bytes (bytes): The raw image bytes.
            
        Returns:
            dict: A dictionary with 'weather' and 'confidence'.
        """
        try:
            # If we don't have a model loaded, return a mock prediction
            if self.model is None:
                logger.info("Running mock prediction.")
                return {
                    "weather": "Rainy",
                    "confidence": 0.93
                }
                
            # Preprocess image
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            # Assuming standard 224x224 input shape for typical CNNs (ResNet, MobileNet, etc.)
            image = image.resize((224, 224))
            img_array = tf.keras.preprocessing.image.img_to_array(image)
            img_array = np.expand_dims(img_array, axis=0) / 255.0
            
            # Predict
            predictions = self.model.predict(img_array)
            class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][class_idx])
            
            weather_class = self.labels[class_idx] if class_idx < len(self.labels) else "Unknown"
            
            return {
                "weather": weather_class,
                "confidence": round(confidence, 4)
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise
