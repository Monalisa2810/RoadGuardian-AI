import os
import sys
import logging
import json

# Add backend directory to sys.path to allow imports from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.reasoning_agent import ReasoningAgent

logging.basicConfig(level=logging.INFO)

def main():
    print("Initializing Reasoning Agent...")
    try:
        agent = ReasoningAgent()
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        print("Make sure you have set your HF_TOKEN in the .env file!")
        return
    
    mock_input = {
      "damage": "Pothole",
      "severity": 8,
      "confidence": 0.95,
      "weather": "Rainy",
      "weather_confidence": 0.92,
      "gps": {
        "lat": 13.0827,
        "lon": 80.2707
      },
      "history": {
        "previous_reports": 4,
        "last_repair": "2026-03-11"
      }
    }
    
    print("\nSending data to Gemma...")
    print(json.dumps(mock_input, indent=2))
    
    try:
        response = agent.analyze(mock_input)
        print("\n--- Response ---")
        print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"\nError during analysis: {e}")

if __name__ == "__main__":
    main()
