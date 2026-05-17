import logging
import os
import time

from dotenv import load_dotenv
from openai import APIError, AzureOpenAI

load_dotenv()

logger = logging.getLogger(__name__)

_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
)

_DEPLOYMENT = os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"]
_BATCH_DELAY = 0.1  # seconds between calls to stay within Azure rate limits


def embed_text(text: str) -> list[float]:
    """Return the embedding vector for a single string."""
    try:
        response = _client.embeddings.create(model=_DEPLOYMENT, input=text)
        return response.data[0].embedding
    except APIError as e:
        logger.error("Embedding failed (deployment=%s): %s", _DEPLOYMENT, e)
        raise


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Return embedding vectors for a list of strings.

    Calls embed_text once per item with a short delay between requests.
    """
    embeddings: list[list[float]] = []
    for i, text in enumerate(texts):
        if i > 0:
            time.sleep(_BATCH_DELAY)
        logger.debug("Embedding text %d/%d", i + 1, len(texts))
        embeddings.append(embed_text(text))
    return embeddings
