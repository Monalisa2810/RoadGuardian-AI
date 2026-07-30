import os
import sys
import asyncio
import logging
import json
import numpy as np
import cv2

# Add backend directory to sys.path to allow imports from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.orchestrator import AgentOrchestrator

logging.basicConfig(level=logging.INFO)

async def main():
    print("Initializing Orchestrator Pipeline...")
    try:
        orchestrator = AgentOrchestrator()
    except Exception as e:
        print(f"Failed to initialize orchestrator: {e}")
        print("Please check your environment variables and firebase credentials.")
        return
        
    # Generate a blank dummy image so YOLO doesn't crash when reading the file
    dummy_image_path = "dummy_image.jpg"
    dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
    cv2.imwrite(dummy_image_path, dummy_image)
        
    print("\nStarting pipeline execution...")
    try:
        final_report = await orchestrator.process_incident(
            image_source=dummy_image_path,
            user_id="user_123_test",
            latitude=13.0827,
            longitude=80.2707
        )
        print("\n--- Pipeline Completed Successfully ---")
        print("\nFinal Generated Report saved to Firestore:")
        print(json.dumps(final_report, indent=2))
        
    except Exception as e:
        print(f"\nPipeline failed: {e}")
        
    finally:
        # Cleanup dummy image
        if os.path.exists(dummy_image_path):
            os.remove(dummy_image_path)

if __name__ == "__main__":
    asyncio.run(main())
