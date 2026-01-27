# Re-export settings from core.config for backward compatibility
from ..core.config import settings, Settings

__all__ = ["settings", "Settings"]