from functools import lru_cache

from .. import config
from .base import AIProvider
from .mock import MockProvider
from .ollama import OllamaProvider


@lru_cache
def get_provider() -> AIProvider:
    """The provider chosen by AI_PROVIDER. FastAPI tests replace this with a fake."""
    if config.AI_PROVIDER == "mock":
        return MockProvider()
    if config.AI_PROVIDER == "ollama":
        return OllamaProvider(config.OLLAMA_URL, config.OLLAMA_MODEL, config.OLLAMA_TIMEOUT)
    raise RuntimeError(f"unknown AI_PROVIDER '{config.AI_PROVIDER}', use 'mock' or 'ollama'")
