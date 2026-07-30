from pydantic import BaseModel
from typing import Optional

class History(BaseModel):
    """
    Schema representing historical maintenance or report context for a specific location.
    """
    previous_reports: int = 0
    last_repair: Optional[str] = None
