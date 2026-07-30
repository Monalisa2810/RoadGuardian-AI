import json
import logging
from typing import Dict, Any
from app.services.gemma_client import GemmaClient

logger = logging.getLogger(__name__)

class ReasoningAgent:
    """
    Reasoning Agent powered by Gemma for analyzing road damage conditions.
    """

    def __init__(self) -> None:
        """
        Initialize the Reasoning Agent.
        
        Initializes the GemmaClient and loads the prompt template.
        """
        self.client = GemmaClient()
        # Adjusted path so it can be run from backend root or scripts dir
        self.prompt_template_path = "app/prompts/risk_prompt.txt"
        self._prompt_template = self._load_prompt_template()

    def _load_prompt_template(self) -> str:
        """
        Load the prompt template from the specified file path.
        
        Returns:
            str: The loaded prompt template.
            
        Raises:
            FileNotFoundError: If the prompt template file cannot be found.
        """
        import os
        
        # Try relative to the script execution first, then fallback to backend directory
        paths_to_try = [
            self.prompt_template_path,
            os.path.join("backend", self.prompt_template_path),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "risk_prompt.txt")
        ]
        
        for path in paths_to_try:
            try:
                with open(path, "r", encoding="utf-8") as file:
                    return file.read()
            except FileNotFoundError:
                continue
                
        logger.error(f"Prompt template file not found in any of the expected locations.")
        raise FileNotFoundError("Could not find risk_prompt.txt")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the input data and determine the risk and priority.
        
        Args:
            data (Dict[str, Any]): The structured input data as a Python dictionary.
            
        Returns:
            Dict[str, Any]: The structured analysis result as a dictionary.
            
        Raises:
            ValueError: If the LLM output is not valid JSON.
            Exception: For other errors during generation or processing.
        """
        context = json.dumps(data, indent=2)
        # Inject the context JSON directly below the prompt
        prompt = f"{self._prompt_template}\n\nInput Data:\n{context}"
        
        try:
            response_text = self.client.generate(prompt)
            cleaned_response = self._clean_json_response(response_text)
            parsed_data = json.loads(cleaned_response)
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            raise ValueError("The LLM returned an invalid JSON response.") from e
        except Exception as e:
            logger.error(f"An error occurred during analysis: {e}")
            raise

    def _clean_json_response(self, text: str) -> str:
        """Clean the raw text response from the LLM to extract JSON."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[len("```json"):]
        elif text.startswith("```"):
            text = text[len("```"):]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
