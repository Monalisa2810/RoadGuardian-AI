import json
import logging
from typing import Dict, Any
from app.services.gemma_client import GemmaClient
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class PlanningAgent:
    """Agent responsible for creating maintenance plans based on reasoning outputs."""
    
    def __init__(self) -> None:
        self.client = GemmaClient()
        self.prompt_template_path = "app/prompts/planning_prompt.txt"
        self._prompt_template = self._load_prompt_template()

    def _load_prompt_template(self) -> str:
        import os
        paths_to_try = [
            self.prompt_template_path,
            os.path.join("backend", self.prompt_template_path),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "planning_prompt.txt")
        ]
        
        for path in paths_to_try:
            try:
                with open(path, "r", encoding="utf-8") as file:
                    return file.read()
            except FileNotFoundError:
                continue
                
        logger.error("Planning prompt template not found.")
        raise FileNotFoundError("Could not find planning_prompt.txt")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        context = json.dumps(data, indent=2)
        prompt = f"{self._prompt_template}\n\nInput Context:\n{context}"
        
        try:
            response_text = self.client.generate(prompt)
            cleaned_response = self._clean_json_response(response_text)
            return json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Planning LLM response as JSON: {e}")
            raise ValueError("The LLM returned an invalid JSON response.") from e
        except Exception as e:
            logger.error(f"An error occurred during planning: {e}")
            raise

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[len("```json"):]
        elif text.startswith("```"):
            text = text[len("```"):]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
