import math
from typing import List, Dict, Any, Optional
from app.database.firebase import get_firestore
from app.database import collections
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class DatabaseService:
    """
    Centralized service for interacting with Firestore.
    All agents should use this service instead of calling Firestore directly.
    """
    def __init__(self) -> None:
        self.db = get_firestore()

    def save_report(self, report_data: Dict[str, Any]) -> str:
        """Saves a new report or updates an existing one."""
        try:
            report_id = report_data.get("report_id")
            if not report_id:
                raise ValueError("report_id is required to save a report.")
                
            doc_ref = self.db.collection(collections.REPORTS).document(report_id)
            doc_ref.set(report_data, merge=True)
            logger.info(f"Successfully saved report {report_id}")
            return report_id
        except Exception as e:
            logger.error(f"Error saving report: {e}")
            raise

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a report by its ID."""
        try:
            doc_ref = self.db.collection(collections.REPORTS).document(report_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            logger.warning(f"Report {report_id} not found.")
            return None
        except Exception as e:
            logger.error(f"Error retrieving report {report_id}: {e}")
            raise

    def get_recent_reports(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieves the most recent reports."""
        try:
            query = self.db.collection(collections.REPORTS).order_by(
                "timestamp", direction="DESCENDING"
            ).limit(limit)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error retrieving recent reports: {e}")
            raise

    def update_report(self, report_id: str, updates: Dict[str, Any]) -> None:
        """Updates specific fields in a report."""
        try:
            doc_ref = self.db.collection(collections.REPORTS).document(report_id)
            doc_ref.update(updates)
            logger.info(f"Successfully updated report {report_id}")
        except Exception as e:
            logger.error(f"Error updating report {report_id}: {e}")
            raise

    def delete_report(self, report_id: str) -> None:
        """Deletes a report."""
        try:
            doc_ref = self.db.collection(collections.REPORTS).document(report_id)
            doc_ref.delete()
            logger.info(f"Successfully deleted report {report_id}")
        except Exception as e:
            logger.error(f"Error deleting report {report_id}: {e}")
            raise

    def get_user_reports(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves all reports submitted by a specific user."""
        try:
            query = self.db.collection(collections.REPORTS).where("user_id", "==", user_id)
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error retrieving reports for user {user_id}: {e}")
            raise

    def get_reports_by_location(self, latitude: float, longitude: float, radius_meters: float = 500) -> List[Dict[str, Any]]:
        """
        Retrieves reports within a specified radius (in meters) of a location.
        Since Firestore lacks native radius querying without GeoHashes, this implements
        a basic bounding-box pre-filter in Python over recent reports.
        """
        try:
            # For hackathon scale, fetch recent reports and filter by distance in memory.
            recent_reports = self.get_recent_reports(limit=100)
            nearby_reports = []
            
            for report in recent_reports:
                loc = report.get("location")
                if not loc:
                    continue
                    
                report_lat = loc.get("latitude")
                report_lon = loc.get("longitude")
                
                if report_lat is None or report_lon is None:
                    continue
                    
                # Haversine formula for distance
                distance = self._calculate_distance(latitude, longitude, report_lat, report_lon)
                if distance <= radius_meters:
                    nearby_reports.append(report)
                    
            logger.info(f"Found {len(nearby_reports)} reports within {radius_meters}m.")
            return nearby_reports
            
        except Exception as e:
            logger.error(f"Error in geospatial query: {e}")
            raise
            
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance between two coordinates in meters using Haversine formula."""
        R = 6371000  # Radius of earth in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2
            
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
