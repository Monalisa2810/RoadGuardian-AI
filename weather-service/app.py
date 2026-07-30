import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from predict import WeatherPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Weather Agent API", version="1.0.0")

# Initialize the predictor globally so it loads the model once on startup
try:
    predictor = WeatherPredictor()
except Exception as e:
    logger.error(f"Failed to initialize WeatherPredictor: {e}")
    predictor = None

@app.post("/predict")
async def predict_weather(file: UploadFile = File(...)):
    """
    Endpoint to predict weather conditions from an uploaded image.
    Accepts multipart/form-data.
    """
    if predictor is None:
        raise HTTPException(status_code=500, detail="WeatherPredictor is not initialized.")
        
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file provided.")
            
        result = predictor.predict(contents)
        return result
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "weather-agent"}

if __name__ == "__main__":
    import uvicorn
    # Start the service on port 8001 as specified in the architecture
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
