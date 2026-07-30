from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from app.services.database_service import DatabaseService

router = APIRouter(tags=["analytics"])
db_service = DatabaseService()

@router.get("/report/{report_id}")
def get_report(report_id: str):
    """Retrieve a specific report by ID."""
    report = db_service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

class StatusUpdate(BaseModel):
    status: str

@router.patch("/report/{report_id}/status")
async def update_report_status(report_id: str, update: StatusUpdate):
    """Update the status of a report (Admin only)."""
    try:
        db_service.update_report(report_id, {"status": update.status})
        return {"message": "success", "status": update.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/reports")
async def get_user_reports(user_id: str):
    """Retrieve all reports submitted by a specific user."""
    try:
        reports = db_service.get_user_reports(user_id)
        # Sort by timestamp descending
        reports.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return {"reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_analytics():
    """Retrieve aggregate analytics for the dashboard."""
    reports = db_service.get_recent_reports(limit=100)
    total_reports = len(reports)
    
    high_risk_count = sum(1 for r in reports if r.get("reasoning", {}).get("risk") == "High")
    
    return {
        "total_reports": total_reports,
        "high_risk_reports": high_risk_count,
        "recent_reports": reports[:10]
    }
