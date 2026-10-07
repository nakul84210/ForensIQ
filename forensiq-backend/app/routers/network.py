"""
network.py — Real Louvain community detection on actual analysis data.

Pipeline:
  1. Load all distinct analyzed accounts from db.analyses (most-recent per username),
     including their recent_posts for text comparison.
  2. Build a weighted graph:
       Nodes = distinct usernames with risk_score / status / platform / followers / cluster_id
       Edges = pairs whose most-similar post pair scores >= SIMILARITY_THRESHOLD
               (reuses clean_text + similarity_score from similarity_engine — no duplication)
  3. Run networkx louvain_communities (built-in, NetworkX >= 3.0, seed=42 for reproducibility)
  4. Compute modularity on the result.
  5. Return nodes (with cluster_id), edges (with weight), and graph-level metrics.

Node sizing:
  The old _node_type() helper (master/bot/amplifier/real) was a 4-bucket discretisation
  of risk_score that was being used to drive frontend node sizing. That's been removed.
  The node payload now exposes risk_score (continuous 0-100) and followers directly so
  the frontend can do its own continuous scale — no information loss through bucketing.

Caching:
  Pairwise similarity over ~100 accounts can take several seconds. A module-level TTL
  cache (CACHE_TTL_SECONDS, default 90s) stores the last computed result. The cache is
  busted immediately via invalidate_graph_cache() which analyze.py calls after every
  new analysis insert — so the graph is always fresh after new data arrives.

Sparse-data guard:
  If there are fewer than MIN_NODES distinct accounts OR fewer than MIN_EDGES similarity
  edges, the graph is too sparse for meaningful clustering — return insufficient_data:true.

Never fabricates nodes/edges/clusters.
"""

import time as _time

from fastapi import APIRouter
from app.database import get_db
from app.ml.similarity_engine import (
    clean_text,
    similarity_score,           # backward-compat alias (text_overlap_score)
    bulk_cache_embeddings,      # batch pre-embed before the O(n²) loop
    semantic_pair_similarity,   # O(1) dot-product after pre-embedding
)

import networkx as nx
from networkx.algorithms.community import louvain_communities, modularity as nx_modularity

router = APIRouter()

# ── Thresholds ────────────────────────────────────────────────────────────────
SIMILARITY_THRESHOLD = 60.0   # semantic similarity 0-100; calibrated 2026-09-07:
                              # same-campaign pairs score 61-69, genuine pairs ≤56
MIN_NODES = 5                  # below this, Louvain gives meaningless results
MIN_EDGES = 3                  # below this, graph is too sparse to cluster
MAX_ACCOUNTS = 100             # MongoDB query cap; keeps runtime bounded
LOUVAIN_SEED = 42              # reproducible community assignments

# ── Result cache ──────────────────────────────────────────────────────────────
# Pairwise similarity over 100 accounts can take several seconds.
# Cache the final result for CACHE_TTL_SECONDS.
# invalidate_graph_cache() is called by analyze.py after every new analysis
# so the graph refreshes immediately when new data arrives.
CACHE_TTL_SECONDS = 90.0

_cache: dict = {"data": None, "ts": 0.0}


def invalidate_graph_cache() -> None:
    """
    Bust the graph cache. Called externally (from analyze.py) whenever a new
    analysis is written to db.analyses, so the next GET /graph recomputes fresh.
    """
    _cache["data"] = None
    _cache["ts"] = 0.0


def _best_pair_similarity(cleaned_a: list, cleaned_b: list) -> float:
    """
    Return the highest semantic_pair_similarity across all (a, b) post combinations.
    Accepts already-cleaned text lists (caller pre-cleans to avoid repeated work).
    Embeddings are resolved from the module-level cache via semantic_pair_similarity —
    each call is O(1) if bulk_cache_embeddings() was called before the outer loop.
    """
    if not cleaned_a or not cleaned_b:
        return 0.0

    best = 0.0
    for ca in cleaned_a:
        for cb in cleaned_b:
            score = semantic_pair_similarity(ca, cb)
            if score > best:
                best = score
                if best >= 99.9:   # short-circuit: perfect match
                    return best
    return best


@router.get("/graph")
async def get_network_graph():
    """
    Build a Louvain-clustered network graph from real db.analyses data.

    Returns:
      nodes           — list of {id, risk_score, status, platform, followers, cluster_id}
                        Node sizing on the frontend uses risk_score (continuous), not
                        an arbitrary type bucket.
      edges           — list of {source, target, weight}  (weight = similarity score 0-100)
      metrics         — {node_count, edge_count, community_count, modularity, algorithm,
                         threshold_used}
      insufficient_data — bool, true when graph is too sparse for meaningful clustering
      empty           — bool, true when there are zero analyzed accounts
      cached          — bool, true when this response was served from the TTL cache
    """
    # ── 0. Serve from cache if still fresh ──────────────────────────────────
    now = _time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        cached_copy = dict(_cache["data"])
        cached_copy["cached"] = True
        return cached_copy

    db = get_db()

    # ── 1. Fetch analyses ────────────────────────────────────────────────────
    try:
        cursor = db.analyses.find(
            {},
            {"_id": 0, "username": 1, "risk_score": 1, "status": 1,
             "platform": 1, "followers": 1, "recent_posts": 1}
        ).sort("analyzed_at", -1).limit(MAX_ACCOUNTS)
        analyses = await cursor.to_list(length=MAX_ACCOUNTS)
    except Exception as e:
        print(f"[network] DB query failed: {e}")
        return {"nodes": [], "edges": [], "metrics": {}, "insufficient_data": False, "empty": True, "cached": False}

    if not analyses:
        return {"nodes": [], "edges": [], "metrics": {}, "insufficient_data": False, "empty": True, "cached": False}

    # ── 2. Deduplicate by username — keep most-recent ────────────────────────
    seen = {}
    for a in analyses:
        uname = (a.get("username") or "").strip()
        if uname and uname not in seen:
            seen[uname] = a

    node_names = list(seen.keys())
    n = len(node_names)

    if n == 0:
        return {"nodes": [], "edges": [], "metrics": {}, "insufficient_data": False, "empty": True, "cached": False}

    # ── 3. Pre-embed all unique post texts in ONE batch call ─────────────────
    # This is the embed-once step. bulk_cache_embeddings() sends all uncached
    # cleaned texts to the model in a single model.encode() call, populating
    # similarity_engine._embed_cache. The O(n²) loop below then only does
    # dict lookups + dot products — no model inference per pair.
    all_cleaned_texts = set()
    account_cleaned: dict = {}   # uname -> list[str] of cleaned post texts
    for uname in node_names:
        posts = seen[uname].get("recent_posts") or []
        raw_texts = [
            (p["content"] if isinstance(p, dict) else str(p))
            for p in posts if p
        ]
        cleaned = [clean_text(t) for t in raw_texts if t]
        cleaned = [c for c in cleaned if c]   # drop empty-after-clean
        account_cleaned[uname] = cleaned
        all_cleaned_texts.update(cleaned)

    if all_cleaned_texts:
        bulk_cache_embeddings(list(all_cleaned_texts))

    # ── 4. Build similarity edges — O(1) per pair thanks to embedding cache ──
    edges_raw = []       # list of (source, target, weight)
    _sim_cache = {}      # in-call dedup cache: (a_name, b_name) -> float

    for i in range(n):
        a_name = node_names[i]
        cleaned_a = account_cleaned.get(a_name, [])
        if not cleaned_a:
            continue

        for j in range(i + 1, n):
            b_name = node_names[j]
            cleaned_b = account_cleaned.get(b_name, [])
            if not cleaned_b:
                continue

            cache_key = (a_name, b_name)
            if cache_key not in _sim_cache:
                _sim_cache[cache_key] = _best_pair_similarity(cleaned_a, cleaned_b)
            score = _sim_cache[cache_key]

            if score >= SIMILARITY_THRESHOLD:
                edges_raw.append((a_name, b_name, score))

    def _build_node(uname: str, cluster_id) -> dict:
        """
        Build a node dict from real stored analysis fields.
        Exposes risk_score (0-100) and followers directly — the frontend uses
        risk_score for continuous node sizing, which is more honest than a
        discretised 4-bucket 'type' label.
        """
        a = seen[uname]
        risk = round(float(a.get("risk_score") or 0), 1)
        status = a.get("status") or "Real"
        followers = int(a.get("followers") or 0)
        return {
            "id": uname,
            "risk_score": risk,
            "status": status,
            "platform": a.get("platform") or "Twitter",
            "followers": followers,
            "cluster_id": cluster_id,
        }

    # ── 4. Sparse-data guard ─────────────────────────────────────────────────
    if n < MIN_NODES or len(edges_raw) < MIN_EDGES:
        result = {
            "nodes": [_build_node(u, None) for u in node_names],
            "edges": [{"source": s, "target": t, "weight": round(w, 1)} for s, t, w in edges_raw],
            "metrics": {
                "node_count": n,
                "edge_count": len(edges_raw),
                "community_count": 0,
                "modularity": None,
                "algorithm": "Louvain (NetworkX)",
                "threshold_used": SIMILARITY_THRESHOLD,
            },
            "insufficient_data": True,
            "empty": False,
            "cached": False,
        }
        _cache["data"] = result
        _cache["ts"] = _time.monotonic()
        return result

    # ── 5. Build NetworkX graph ──────────────────────────────────────────────
    G = nx.Graph()
    G.add_nodes_from(node_names)
    for src, tgt, w in edges_raw:
        G.add_edge(src, tgt, weight=w)

    # ── 6. Run Louvain community detection ──────────────────────────────────
    try:
        communities = louvain_communities(G, weight="weight", seed=LOUVAIN_SEED)
        node_to_cluster = {}
        for cluster_idx, community in enumerate(communities):
            for node in community:
                node_to_cluster[node] = cluster_idx

        mod_score = round(float(nx_modularity(G, communities, weight="weight")), 4)
        community_count = len(communities)
    except Exception as e:
        print(f"[network] Louvain failed: {e}")
        node_to_cluster = {uname: 0 for uname in node_names}
        mod_score = None
        community_count = 1


    edges_out = [
        {"source": s, "target": t, "weight": round(w, 1)}
        for s, t, w in edges_raw
    ]

    result = {
        "nodes": [_build_node(u, node_to_cluster.get(u, 0)) for u in node_names],
        "edges": edges_out,
        "metrics": {
            "node_count": n,
            "edge_count": len(edges_out),
            "community_count": community_count,
            "modularity": mod_score,
            "algorithm": "Louvain (NetworkX 3.x)",
            "threshold_used": SIMILARITY_THRESHOLD,
        },
        "insufficient_data": False,
        "empty": False,
        "cached": False,
    }
    _cache["data"] = result
    _cache["ts"] = _time.monotonic()
    return result
