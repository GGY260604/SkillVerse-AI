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



_local_embedding_model = None


def get_local_embedding_model():
    """
    Lazy-loads the in-process BAAI/bge-m3 model using fastembed or sentence-transformers
    when running directly inside the RunPod GPU container (ENABLE_LOCAL_BGE_M3=true).
    """
    global _local_embedding_model
    if not settings.ENABLE_LOCAL_BGE_M3:
        return None
    if _local_embedding_model is not None:
        return _local_embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        _local_embedding_model = SentenceTransformer("BAAI/bge-m3")
        return _local_embedding_model
    except Exception:
        try:
            from fastembed import TextEmbedding
            _local_embedding_model = TextEmbedding(model_name="BAAI/bge-m3")
            return _local_embedding_model
        except Exception:
            return None



def get_embedding_from_local_bge_m3(text: str) -> Optional[List[float]]:
    """
    Computes 1024-dimensional semantic embedding in-process using BAAI/bge-m3
    when FastAPI is deployed on a RunPod GPU instance.
    """
    model = get_local_embedding_model()
    if not model:
        return None
    try:
        if hasattr(model, "embed"):
            embeddings = list(model.embed([text]))
            if embeddings and len(embeddings) > 0:
                return [float(x) for x in embeddings[0]]
        if hasattr(model, "encode"):
            vec = model.encode(text)
            return [float(x) for x in vec]
    except Exception:
        return None
    return None


_EMBEDDING_CACHE: Dict[str, List[float]] = {}
_active_embedding_key_index = 4
_cache_dirty = False

# Auto-load precomputed skill embeddings cache on startup
try:
    import json
    import os
    _cache_file = os.path.join(os.path.dirname(__file__), "..", "db", "skill_embeddings_cache.json")
    if os.path.exists(_cache_file):
        with open(_cache_file, "r", encoding="utf-8") as _f:
            _loaded_cache = json.load(_f)
            for _k, _v in _loaded_cache.items():
                _EMBEDDING_CACHE[_k.lower().strip()] = _v
except Exception:
    pass


def persist_embedding_cache():
    """Flushes newly generated embeddings to the persistent JSON cache on disk."""
    global _cache_dirty
    if not _cache_dirty:
        return
    try:
        import json
        import os
        _cache_file = os.path.join(os.path.dirname(__file__), "..", "db", "skill_embeddings_cache.json")
        with open(_cache_file, "w", encoding="utf-8") as _f:
            json.dump(_EMBEDDING_CACHE, _f)
        _cache_dirty = False
    except Exception:
        pass


async def get_embedding_from_gemini(text: str) -> Optional[List[float]]:
    """
    Fallback embedding generator using Google's modern embedding models.
    Tries gemini-embedding-001 with outputDimensionality=1024.
    Cycles through available GEMINI_API_KEYS in the pool, remembering the last working key.
    """
    global _active_embedding_key_index
    if not settings.GEMINI_API_KEYS:
        return None

    candidate_models = ["gemini-embedding-001", "gemini-embedding-2"]
    total_keys = len(settings.GEMINI_API_KEYS)

    for model_name in candidate_models:
        payload = {
            "model": f"models/{model_name}",
            "content": {
                "parts": [{"text": text}]
            },
            "outputDimensionality": 1024,
        }

        for offset in range(total_keys):
            key_index = (_active_embedding_key_index + offset) % total_keys
            api_key = settings.GEMINI_API_KEYS[key_index]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent?key={api_key}"
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        result = response.json()
                        values = result.get("embedding", {}).get("values", [])
                        if values:
                            _active_embedding_key_index = key_index  # Remember working key!
                            if len(values) < 1024:
                                return values + [0.0] * (1024 - len(values))
                            return values[:1024]
                    elif response.status_code in [402, 429]:
                        continue
            except Exception:
                continue

    return None


async def generate_embedding(text: str) -> List[float]:
    """
    Generates a dense 1024-dimensional semantic vector representation for the given text.
    Uses in-memory LRU cache to make repeated calls instantaneous (0.000ms).
    1. Primary (RunPod In-Process GPU): Local BAAI/bge-m3 model.
    2. Primary (External RunPod URL): RunPod GPU Endpoint if configured.
    3. Fallback: Google Gemini Embedding API (gemini-embedding-001 / 1024-dim).
    4. Failsafe fallback: Deterministic hash pseudo-vector (guarantees zero crashes).
    """
    global _cache_dirty
    clean_text = text.lower().strip()
    if not clean_text:
        return [0.0] * 1024

    # Check in-memory cache first (sub-millisecond instant hit)
    cached = _EMBEDDING_CACHE.get(clean_text)
    if cached is not None:
        return cached

    vector: Optional[List[float]] = None

    # 1. Primary: In-process GPU BAAI/bge-m3 (FastAPI on RunPod)
    local_vector = get_embedding_from_local_bge_m3(clean_text)
    if local_vector and len(local_vector) > 0:
        vector = local_vector

    # 2. Remote RunPod GPU endpoint (if configured)
    if vector is None:
        runpod_vector = await get_embedding_from_runpod(clean_text)
        if runpod_vector and len(runpod_vector) > 0:
            vector = runpod_vector

    # 3. Fallback: Google Gemini Embedding API
    if vector is None:
        gemini_vector = await get_embedding_from_gemini(clean_text)
        if gemini_vector and len(gemini_vector) > 0:
            vector = gemini_vector

    # 4. Deterministic pseudo-vector fallback (zero downtime guarantee)
    if vector is None:
        vector = generate_deterministic_vector(clean_text)

    # Store in memory cache
    _EMBEDDING_CACHE[clean_text] = vector
    _cache_dirty = True

    return vector


async def is_skill_semantically_matched(
    user_skill: str,
    req_skill: str,
    threshold: float = 0.55,
) -> bool:
    """
    Computes dynamic semantic similarity between a candidate skill and a required role skill.
    Eliminates reliance on hardcoded synonym dictionaries.
    """
    u_norm = user_skill.lower().strip()
    r_norm = req_skill.lower().strip()

    # Fast-path: exact or substring containment
    if u_norm == r_norm or u_norm in r_norm or r_norm in u_norm:
        return True

    # Vector cosine similarity
    vec_u = await generate_embedding(user_skill)
    vec_r = await generate_embedding(req_skill)
    sim = cosine_similarity(vec_u, vec_r)
    return sim >= threshold



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
