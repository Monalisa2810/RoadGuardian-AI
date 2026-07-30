import logging
import sys
from pathlib import Path

def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance for the given module name.
    
    Configures logging to output to both the console and a file named 'roadguardian.log'.
    Uses INFO level by default and includes timestamps, logger name, log level, and message.
    
    Args:
        name (str): The name of the logger, typically __name__ of the calling module.
        
    Returns:
        logging.Logger: The configured logger instance.
    """
    logger = logging.getLogger(name)
    
    # If the logger already has handlers, it means it's been configured before.
    # We avoid adding duplicate handlers.
    if logger.hasHandlers():
        return logger

    logger.setLevel(logging.INFO)

    # Create a unified formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # 2. File Handler
    # We place the log file in the backend/ root folder for easy access
    log_file_path = Path(__file__).resolve().parent.parent.parent / "roadguardian.log"
    
    file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    # Add both handlers to our logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    # Prevent log messages from propagating to the root logger to avoid duplicates
    logger.propagate = False

    return logger
