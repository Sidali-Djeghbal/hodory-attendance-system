"""
File serving endpoints for uploaded assets (justifications, avatars, etc).

We intentionally do not expose the whole filesystem; only known upload dirs.
"""

import os
import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse


files_router = APIRouter(tags=["Files"])


def safe_resolve(base_dir: Path, name: str) -> Path:
	# Prevent path traversal (e.g. "../../etc/passwd").
	candidate = (base_dir / name).resolve()
	base_resolved = base_dir.resolve()
	if base_resolved not in candidate.parents and candidate != base_resolved:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")
	return candidate


@files_router.get(
	"/files/justifications/{filename}",
	summary="Get justification file",
	description="Serve an uploaded justification file by filename.",
)
def get_justification_file(filename: str):
	base_dir = Path("uploads") / "justifications"
	path = safe_resolve(base_dir, filename)
	if not path.exists() or not path.is_file():
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

	media_type, _ = mimetypes.guess_type(str(path))
	if not media_type:
		media_type = "application/octet-stream"

	# IMPORTANT: Use inline disposition so Electron/Chromium previews instead of downloading.
	# Some Starlette versions set Content-Disposition=attachment by default even when `filename`
	# isn't provided, so we override explicitly after constructing the response.
	response = FileResponse(str(path), media_type=media_type)
	response.headers["Content-Disposition"] = f'inline; filename="{os.path.basename(str(path))}"'
	return response
