import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env in the root project folder
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

class Settings:
    """
    Application settings and configuration.
    
    Loads required environment variables and validates their presence.
    """
    def __init__(self) -> None:
        self.hf_token: str | None = os.getenv("HF_TOKEN")
        self.gemma_model: str | None = os.getenv("GEMMA_MODEL")
        
        self._validate()
        
    def _validate(self) -> None:
        """
        Validates that required environment variables are present.
        
        Raises:
            ValueError: If HF_TOKEN or GEMMA_MODEL are missing.
        """
        if not self.hf_token:
            raise ValueError("Missing required environment variable: HF_TOKEN")
        if not self.gemma_model:
            raise ValueError("Missing required environment variable: GEMMA_MODEL")

# Export a singleton instance
settings = Settings()
