import math
import httpx
from typing import List, Optional
from ..config import settings


async def get_embedding_from_runpod(text: str) -> Optional[List[float]]:
    """
    Queries the RunPod GPU microservice running BAAI/bge-m3
    to generate a 1024-dimensional semantic embedding vector.
    Supports:
    1. RunPod OpenAI Serverless: https://api.runpod.ai/v2/{ENDPOINT_ID}/openai/v1/embeddings
    2. RunPod Native Serverless: https://api.runpod.ai/v2/{ENDPOINT_ID}/runsync
    3. RunPod Dedicated Pod Proxy: https://{POD_ID}-80.proxy.runpod.net/v1/embeddings
    """
    if not settings.RUNPOD_API_ENDPOINT:
        return None

    raw_endpoint = settings.RUNPOD_API_ENDPOINT.strip().rstrip("/")
    headers = {"Content-Type": "application/json"}
    if settings.RUNPOD_API_KEY:
        headers["Authorization"] = f"Bearer {settings.RUNPOD_API_KEY}"

    # Determine endpoint style and construct appropriate payload
    is_runsync = raw_endpoint.endswith("/runsync")
    if is_runsync:
        url = raw_endpoint
        payload = {
            "input": {
                "input": text,
                "model": "BAAI/bge-m3",
            }
        }
    else:
        # Standard OpenAI / TEI endpoint
        if raw_endpoint.endswith("/v1/embeddings") or raw_endpoint.endswith("/embeddings"):
            url = raw_endpoint
        elif "api.runpod.ai/v2/" in raw_endpoint and not raw_endpoint.endswith("/openai"):
            url = f"{raw_endpoint}/openai/v1/embeddings"
        else:
            url = f"{raw_endpoint}/v1/embeddings"

        payload = {
            "input": text,
            "model": "BAAI/bge-m3",
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                
                # Format A: RunPod Native runsync output wrapper {"output": [...]}
                if "output" in data:
                    out = data["output"]
                    if isinstance(out, list) and len(out) > 0:
                        if isinstance(out[0], float) or isinstance(out[0], int):
                            return [float(x) for x in out]
                        if isinstance(out[0], list):
                            return [float(x) for x in out[0]]
                        if isinstance(out[0], dict) and "embedding" in out[0]:
                            return [float(x) for x in out[0]["embedding"]]
                    if isinstance(out, dict) and "embedding" in out:
                        return [float(x) for x in out["embedding"]]

                # Format B: OpenAI standard {"data": [{"embedding": [...]}]}
                if "data" in data and len(data["data"]) > 0:
                    item = data["data"][0]
                    if isinstance(item, dict) and "embedding" in item:
                        return [float(x) for x in item["embedding"]]

                # Format C: Hugging Face TEI direct array [[0.1, 0.2, ...]]
                if isinstance(data, list) and len(data) > 0:
                    if isinstance(data[0], list):
                        return [float(x) for x in data[0]]
                    if isinstance(data[0], float) or isinstance(data[0], int):
                        return [float(x) for x in data]

                # Format D: Direct embedding key {"embedding": [...]}
                if "embedding" in data and isinstance(data["embedding"], list):
                    return [float(x) for x in data["embedding"]]

    except Exception:
        # Network timeout or endpoint offline -> seamless fallback to Gemini/pseudo-vector
        return None

    return None



async def get_embedding_from_gemini(text: str) -> Optional[List[float]]:
    """
    Fallback embedding generator using Google's text-embedding-004 model.
    Cycles through available GEMINI_API_KEYS in the pool.
    """
    if not settings.GEMINI_API_KEYS:
        return None

    model_name = "text-embedding-004"
    payload = {
        "model": f"models/{model_name}",
        "content": {
            "parts": [{"text": text}]
        }
    }

    for api_key in settings.GEMINI_API_KEYS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    values = result.get("embedding", {}).get("values", [])
                    if values:
                        # Pad or normalize to 1024 dimensions if needed
                        if len(values) < 1024:
                            padded = values + [0.0] * (1024 - len(values))
                            return padded
                        return values[:1024]
        except Exception:
            continue

    return None


async def generate_embedding(text: str) -> List[float]:
    """
    Generates a dense semantic vector representation for the given text.
    1. Tries Primary: RunPod GPU Pod (BAAI/bge-m3, 1024-dim).
    2. Falls back: Google text-embedding-004 API.
    3. Failsafe fallback: Deterministic hash pseudo-vector (guarantees zero crashes).
    """
    clean_text = text.strip()
    if not clean_text:
        return [0.0] * 1024

    # 1. Primary: RunPod GPU Pod
    runpod_vector = await get_embedding_from_runpod(clean_text)
    if runpod_vector and len(runpod_vector) > 0:
        return runpod_vector

    # 2. Fallback: Google Gemini Embedding API
    gemini_vector = await get_embedding_from_gemini(clean_text)
    if gemini_vector and len(gemini_vector) > 0:
        return gemini_vector

    # 3. Deterministic pseudo-vector fallback (zero downtime guarantee)
    return generate_deterministic_vector(clean_text)


def generate_deterministic_vector(text: str, dim: int = 1024) -> List[float]:
    """
    Generates a deterministic normalized pseudo-vector from text hash.
    Used as an emergency offline fallback when no external ML APIs are reachable.
    """
    import hashlib
    raw_hash = hashlib.sha256(text.encode("utf-8")).digest()
    vec = []
    for i in range(dim):
        byte_val = raw_hash[i % len(raw_hash)]
        # Map to range [-1.0, 1.0]
        val = (byte_val / 127.5) - 1.0
        vec.append(val)
    
    # Normalize vector to unit length
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Calculates the cosine similarity between two numeric vectors:
    CosineSimilarity = (A . B) / (||A|| * ||B||)
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(-1.0, min(1.0, dot_product / (norm_a * norm_b)))
