"""
Structured JSON logging configuration
Todas los logs se envían a stdout en formato JSON para que Logstash los procese
"""

import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """Formatea logs como JSON para Logstash"""

    def format(self, record):
        log_data = {
            "@timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Agregar excepciones si existen
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Agregar custom attributes
        if hasattr(record, "service"):
            log_data["service"] = record.service
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        return json.dumps(log_data)


def setup_logging():
    """Configura logging estructurado en JSON"""

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Handler para stdout (JSON)
    json_handler = logging.StreamHandler(sys.stdout)
    json_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(json_handler)

    # Deshabilitar logging por defecto de libraries (puede ser noise)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

    return root_logger


# Ejemplo de uso en otro archivo:
# logger = logging.getLogger(__name__)
# logger.info("Cita creada", extra={"request_id": "abc123", "user_id": 42})
