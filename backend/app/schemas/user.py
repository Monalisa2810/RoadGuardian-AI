from pydantic import BaseModel

class User(BaseModel):
    """
    Schema representing a RoadGuardian AI user.
    """
    user_id: str
    email: str
    role: str = "citizen"
