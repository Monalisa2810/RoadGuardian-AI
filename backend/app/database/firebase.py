import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_firestore_client: Optional[firestore.client] = None

def initialize_firebase() -> None:
    """
    Initializes the Firebase Admin SDK if not already initialized.
    Uses the GOOGLE_APPLICATION_CREDENTIALS environment variable.
    """
    global _firestore_client
    
    if firebase_admin._apps:
        logger.info("Firebase Admin SDK is already initialized.")
        return

    try:
        # Default initialization relies on GOOGLE_APPLICATION_CREDENTIALS in env
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path:
            logger.info(f"Initializing Firebase with credentials from {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set. Attempting default initialization (works in GCP environments).")
            firebase_admin.initialize_app()
            
        logger.info("Successfully initialized Firebase Admin SDK.")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        raise

def get_firestore() -> firestore.client:
    """
    Returns a singleton Firestore client.
    Initializes Firebase if it hasn't been initialized yet.
    
    Returns:
        firestore.client: The Firestore client instance.
    """
    global _firestore_client
    
    if _firestore_client is None:
        initialize_firebase()
        try:
            _firestore_client = firestore.client()
            logger.info("Firestore client created.")
        except Exception as e:
            logger.error(f"Failed to get Firestore client: {e}")
            raise
            
    return _firestore_client
