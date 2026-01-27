import uvicorn
import os
from pathlib import Path

from dotenv import load_dotenv

if __name__ == "__main__":
    backend_dir = Path(__file__).resolve().parent

    # Load env files explicitly so local/offline config is reliable even when running from
    # different working directories or shells.
    load_dotenv(backend_dir / ".env", override=False)
    if (backend_dir / ".env.local").exists():
        # Local dev should override remote defaults.
        load_dotenv(backend_dir / ".env.local", override=True)

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("RELOAD", "1").strip() not in {"0", "false", "False", "no", "NO"}

    # When running with reload, watch only backend source code.
    # Watching runtime dirs (e.g. `uploads/`) can trigger reload loops and cause timeouts.
    uvicorn.run(
        "src:app",
        host=host,
        port=port,
        reload=reload_enabled,
        reload_dirs=["src"] if reload_enabled else None,
        reload_excludes=["uploads", "uploads/*", "__pycache__", "*.pyc"] if reload_enabled else None,
    )
