#!/usr/bin/env python3
import os

import uvicorn

from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    port = int(os.getenv("PORT", settings.omega_api_port))
    reload = os.getenv("OMEGA_RELOAD", "false").lower() == "true"
    uvicorn.run(
        "app.main:app",
        host=settings.omega_api_host,
        port=port,
        reload=reload,
    )
