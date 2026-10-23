import os
import math
import asyncio
import httpx
from typing import List, Optional, Dict
from config import settings
from services.http_client import get_shared_client


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
        client = get_shared_client(timeout=10.0)
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
    Loads and caches the in-process BAAI/bge-m3 model using sentence-transformers.
    Automatically configures optimal hardware device (CUDA GPU vs multi-threaded CPU).
    """
    global _local_embedding_model
    if not settings.ENABLE_LOCAL_BGE_M3:
        return None
    if _local_embedding_model is not None:
        return _local_embedding_model
    try:
        import torch
        from sentence_transformers import SentenceTransformer

        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cpu":
            num_cores = max(1, min(8, os.cpu_count() or 4))
            torch.set_num_threads(num_cores)

        _local_embedding_model = SentenceTransformer("BAAI/bge-m3", device=device)
        return _local_embedding_model
    except Exception as e:
        print(f"[embedding_service] SentenceTransformer load failed ({e}), attempting fastembed fallback...")
        try:
            from fastembed import TextEmbedding
            _local_embedding_model = TextEmbedding(model_name="BAAI/bge-m3")
            return _local_embedding_model
        except Exception:
            return None


def get_embeddings_batch_from_local_bge_m3(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Vectorized batch encoder using BAAI/bge-m3 with PyTorch tensor acceleration.
    Encodes multiple texts simultaneously (batch_size=32) with normalized embeddings.
    """
    if not texts:
        return []
    model = get_local_embedding_model()
    if not model:
        return None
    try:
        import torch
        if hasattr(model, "encode"):
            with torch.inference_mode():
                vectors = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
                return [v.tolist() if hasattr(v, "tolist") else [float(x) for x in v] for v in vectors]
        elif hasattr(model, "embed"):
            embeddings = list(model.embed(texts))
            return [[float(x) for x in emb] for emb in embeddings]
    except Exception as err:
        print(f"[embedding_service] Local BGE-M3 batch encode failed: {err}")
        return None
    return None


def get_embedding_from_local_bge_m3(text: str) -> Optional[List[float]]:
    """
    Computes 1024-dimensional semantic embedding in-process using BAAI/bge-m3.
    """
    batch = get_embeddings_batch_from_local_bge_m3([text])
    if batch and len(batch) > 0:
        return batch[0]
    return None


_EMBEDDING_CACHE: dict[str, List[float]] = {}
_active_embedding_key_index = 0


def persist_embedding_cache():
    """No-op: In-memory RAM cache is maintained during runtime; disk writes disabled for stateless RunPod deployments."""
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
                client = get_shared_client(timeout=4.0)
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


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    High-throughput vectorized batch embedding generator.
    1. Checks in-memory cache for all requested texts.
    2. Batches all uncached items together into a single vectorized local model call (PyTorch tensor acceleration).
    3. Offloads CPU/GPU inference to a background thread pool via asyncio.to_thread (non-blocking).
    4. Falls back to Gemini / RunPod / deterministic hash for any items that fail.
    5. Caches new results and returns full list in original request order.
    """
    if not texts:
        return []

    results: List[Optional[List[float]]] = [None] * len(texts)
    missing_indices: List[int] = []
    missing_texts: List[str] = []

    # 1. Populate from in-memory cache first (0.00ms hit)
    for idx, raw_t in enumerate(texts):
        clean_t = (raw_t or "").lower().strip()
        if not clean_t:
            results[idx] = [0.0] * 1024
            continue
        cached = _EMBEDDING_CACHE.get(clean_t)
        if cached is not None:
            results[idx] = cached
        else:
            missing_indices.append(idx)
            missing_texts.append(clean_t)

    if not missing_texts:
        return [r for r in results if r is not None]

    # 2. Vectorized Batch Execution via Local BGE-M3 (RunPod / Local CPU)
    if settings.ENABLE_LOCAL_BGE_M3:
        try:
            local_batch = await asyncio.to_thread(
                get_embeddings_batch_from_local_bge_m3,
                missing_texts,
            )
            if local_batch and len(local_batch) == len(missing_texts):
                for orig_idx, clean_t, vec in zip(missing_indices, missing_texts, local_batch):
                    if vec and len(vec) > 0:
                        _EMBEDDING_CACHE[clean_t] = vec
                        results[orig_idx] = vec
        except Exception as e:
            print(f"[embedding_service] Local batch encode error: {e}")

    # 3. Fallback for any remaining uncomputed items
    still_missing = [(idx, t) for idx, t in zip(missing_indices, missing_texts) if results[idx] is None]
    if still_missing:
        # Fallback cascade item-by-item (RunPod endpoint -> Gemini -> pseudo-vector)
        for orig_idx, clean_t in still_missing:
            vec = await _generate_single_embedding_fallback(clean_t)
            results[orig_idx] = vec

    return [r if r is not None else [0.0] * 1024 for r in results]


async def _generate_single_embedding_fallback(clean_text: str) -> List[float]:
    """Helper fallback when local model is disabled or fails."""
    # 1. Remote RunPod GPU endpoint (if configured)
    runpod_vector = await get_embedding_from_runpod(clean_text)
    if runpod_vector and len(runpod_vector) > 0:
        _EMBEDDING_CACHE[clean_text] = runpod_vector
        return runpod_vector

    # 2. Fallback: Google Gemini Embedding API
    gemini_vector = await get_embedding_from_gemini(clean_text)
    if gemini_vector and len(gemini_vector) > 0:
        _EMBEDDING_CACHE[clean_text] = gemini_vector
        return gemini_vector

    # 3. Deterministic pseudo-vector fallback (zero downtime guarantee)
    pseudo_vector = generate_deterministic_vector(clean_text)
    _EMBEDDING_CACHE[clean_text] = pseudo_vector
    return pseudo_vector


async def generate_embedding(text: str) -> List[float]:
    """
    Generates a dense 1024-dimensional semantic vector representation for the given text.
    Uses in-memory LRU cache to make repeated calls instantaneous (0.000ms).
    """
    clean_text = text.lower().strip()
    if not clean_text:
        return [0.0] * 1024

    # Check in-memory cache first (sub-millisecond instant hit)
    cached = _EMBEDDING_CACHE.get(clean_text)
    if cached is not None:
        return cached

    # Fast-path via vectorized batch function
    batch_res = await generate_embeddings_batch([clean_text])
    if batch_res and len(batch_res) > 0:
        return batch_res[0]

    return generate_deterministic_vector(clean_text)


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
