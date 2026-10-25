import httpx
from typing import Optional

# High-performance connection pool configuration
_HTTP_LIMITS = httpx.Limits(
    max_keepalive_connections=50,
    max_connections=100,
    keepalive_expiry=60.0,
)

_shared_client: Optional[httpx.AsyncClient] = None


def get_shared_client(timeout: float = 15.0) -> httpx.AsyncClient:
    """
    Returns a process-wide singleton httpx.AsyncClient with persistent keep-alive
    connection pooling. Reusing existing TCP/TLS connections reduces network latency
    by eliminating redundant socket handshakes.
    """
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(
            limits=_HTTP_LIMITS,
            timeout=timeout,
            follow_redirects=True,
        )
    return _shared_client


async def close_shared_client():
    """Gracefully closes all open persistent connections upon microservice shutdown."""
    global _shared_client
    if _shared_client is not None and not _shared_client.is_closed:
        try:
            await _shared_client.aclose()
        except Exception:
            pass
        _shared_client = None
