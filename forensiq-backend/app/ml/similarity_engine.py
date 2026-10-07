"""
similarity_engine.py
====================
Dual-score text similarity for coordinated account detection.

Two scores are kept separate — not blended — because they tell different stories:

  text_overlap_score        0-100   TF-IDF cosine (60%) + SequenceMatcher (40%)
                                    Measures literal character/word overlap.
                                    High = near-verbatim copy of same template.

  semantic_similarity_score 0-100   bge-small-en-v1.5 sentence embedding cosine
                                    Measures meaning / intent similarity.
                                    High even when wording is completely different.

The combination enables the AI narrator to say:
  "These posts are textually different (14% overlap) but semantically
   near-identical (69% similarity) — a hallmark of the same scam template
   reworded to evade literal-match detection."

Embedding model: BAAI/bge-small-en-v1.5
  2025 recommended lightweight model (33 M params, ~133 MB weights).
  Outperforms all-MiniLM-L6-v2 on MTEB retrieval benchmarks while remaining
  small enough for CPU inference on a dev machine.

Embedding cache: module-level dict keyed by sha256(clean_text) → np.ndarray.
  get_embedding()         computes a vector ONCE per unique cleaned post content.
  bulk_cache_embeddings() pre-embeds a batch in a single model.encode() call.
  semantic_pair_similarity() then performs O(1) dot-product lookups — no
  re-encoding per comparison. This keeps the O(n²) graph-building loop fast.

Calibration data (bge-small-en-v1.5, 2026-09-07):
  Same template, exact          text_overlap=100.0  semantic=100.0
  Same campaign, diff wording   text_overlap= 14.0  semantic= 69.1  ← threshold above
  BUY NOW vs JOIN TELEGRAM      text_overlap= 10.4  semantic= 65.2
  CLICK LINK vs JOIN TELEGRAM   text_overlap= 15.3  semantic= 61.4
  Genuine vs spam               text_overlap=  5.8  semantic= 55.1  ← threshold below
  Genuine vs genuine            text_overlap= 12.1  semantic= 56.3

  → Threshold 60.0 provides a clean gap between coordinated spam (61-100)
    and legitimate / cross-category pairs (≤56).
"""

import hashlib
import re
from difflib import SequenceMatcher

import numpy as np

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as _sk_cosine
    _SKLEARN_AVAILABLE = True
except ImportError:
    _SKLEARN_AVAILABLE = False

# ── Embedding model (lazy-loaded on first use) ────────────────────────────────
# False = load was attempted and failed; None = not yet attempted.
_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        except Exception as e:
            print(f"[similarity_engine] WARNING: embedding model unavailable: {e}")
            _model = False   # sentinel — suppress retries
    return _model if _model else None


# ── Embedding cache: sha256(clean_text) → np.ndarray ─────────────────────────
_embed_cache: dict = {}


# ── Text cleaning ──────────────────────────────────────────────────────────────
def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'#\w+', '', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ── Literal text-overlap score (original metric, preserved) ───────────────────
def text_overlap_score(a: str, b: str) -> float:
    """
    60 % TF-IDF cosine + 40 % SequenceMatcher, 0-100 scale.
    Measures literal word / character overlap only.
    High when phrasing is nearly identical; low when intent is the same
    but wording differs (the gap that semantic_pair_similarity fills).
    """
    a_clean = clean_text(a)
    b_clean = clean_text(b)
    if not a_clean or not b_clean:
        return 0.0
    if _SKLEARN_AVAILABLE and len(a_clean.split()) >= 2 and len(b_clean.split()) >= 2:
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), analyzer='word')
            tfidf_matrix = vectorizer.fit_transform([a_clean, b_clean])
            cos_sim = float(_sk_cosine(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]) * 100
            seq_sim = SequenceMatcher(None, a_clean, b_clean).ratio() * 100
            return round(0.60 * cos_sim + 0.40 * seq_sim, 1)
        except Exception:
            pass
    return round(SequenceMatcher(None, a_clean, b_clean).ratio() * 100, 1)


# Backward-compatible alias — callers that imported similarity_score still work.
def similarity_score(a: str, b: str) -> float:
    return text_overlap_score(a, b)


# ── Embedding cache API ────────────────────────────────────────────────────────
def get_embedding(text: str):
    """
    Return the L2-normalised embedding for clean_text(text) as np.ndarray.
    Computes at most ONCE per unique cleaned content (cached by sha256).
    Returns None if the embedding model is unavailable.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return None
    key = hashlib.sha256(cleaned.encode()).hexdigest()
    if key not in _embed_cache:
        model = _get_model()
        if model is None:
            return None
        _embed_cache[key] = model.encode(cleaned, normalize_embeddings=True)
    return _embed_cache[key]


def bulk_cache_embeddings(texts: list) -> None:
    """
    Pre-embed a list of ALREADY-CLEANED texts in a single model.encode() batch.
    Only texts not already cached are sent to the model.

    Call this BEFORE the O(n²) pairwise loop so every subsequent
    semantic_pair_similarity() call is a pure dict lookup + dot product.

    Args:
        texts: list of clean_text()-processed strings (do not pass raw posts).
    """
    uncached = [
        t for t in texts
        if t and hashlib.sha256(t.encode()).hexdigest() not in _embed_cache
    ]
    if not uncached:
        return
    model = _get_model()
    if model is None:
        return
    embeddings = model.encode(
        uncached, normalize_embeddings=True,
        batch_size=64, show_progress_bar=False,
    )
    for text, emb in zip(uncached, embeddings):
        key = hashlib.sha256(text.encode()).hexdigest()
        _embed_cache[key] = emb


# ── Semantic pair similarity ───────────────────────────────────────────────────
def semantic_pair_similarity(a: str, b: str) -> float:
    """
    Semantic similarity 0-100 via bge-small-en-v1.5 embedding cosine.
    Uses the embedding cache — O(1) if both texts were pre-embedded via
    bulk_cache_embeddings(). Falls back to 0.0 if the model is unavailable.
    """
    emb_a = get_embedding(a)
    emb_b = get_embedding(b)
    if emb_a is None or emb_b is None:
        return 0.0
    score = float(np.dot(emb_a, emb_b)) * 100
    return round(max(0.0, min(100.0, score)), 1)


# ── Dual score ─────────────────────────────────────────────────────────────────
def similarity_scores(a: str, b: str) -> dict:
    """
    Return both scores as a dict:
      text_overlap_score        — literal word/character similarity (0-100)
      semantic_similarity_score — meaning/intent similarity via embeddings (0-100)

    These are intentionally not blended so that the narrator can surface the
    textually-different-but-semantically-identical pattern.
    """
    return {
        "text_overlap_score": text_overlap_score(a, b),
        "semantic_similarity_score": semantic_pair_similarity(a, b),
    }


# ── Benchmark corpus ───────────────────────────────────────────────────────────
# NOTE: All entries are near-verbatim rewording of ONE spam template
# ("BUY NOW crypto guaranteed 1000x returns click link in bio").
# This gives the old literal scanner high precision on that template family, but
# zero recall on reworded campaigns (e.g. "PUMP ALERT NEXT 100X GEM").
# The semantic upgrade fixes this: scan_similarity now uses semantic scores,
# so "PUMP ALERT NEXT 100X GEM" correctly scores ~65-69 against these entries
# even with near-zero literal overlap.
BENCHMARK_POST_CORPUS = [
    {
        "username": "@bot_spam_01", "platform": "Twitter",
        "content": "BUY NOW crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #invest #money",
        "followers": 89, "posted_at": "Recent",
    },
    {
        "username": "@crypto_army_x", "platform": "Twitter",
        "content": "BUY NOW crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #invest",
        "followers": 112, "posted_at": "Recent",
    },
    {
        "username": "@pump_signal_99", "platform": "Twitter",
        "content": "buy now crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #money",
        "followers": 67, "posted_at": "Recent",
    },
    {
        "username": "@invest_now_fast", "platform": "Instagram",
        "content": "BUY NOW! crypto guaranteed returns 1000x click link in bio #invest #money #rich",
        "followers": 203, "posted_at": "Recent",
    },
    {
        "username": "@crypto_blast_22", "platform": "Twitter",
        "content": "BUY NOW crypto 1000x guaranteed returns click link in bio #crypto #bitcoin",
        "followers": 45, "posted_at": "Recent",
    },
    {
        "username": "@moon_shot_alert", "platform": "Twitter",
        "content": "Crypto guaranteed 1000x BUY NOW link in bio #bitcoin #invest #money #crypto",
        "followers": 178, "posted_at": "Recent",
    },
    {
        "username": "@daily_signal_bot", "platform": "Instagram",
        "content": "Guaranteed crypto returns 1000x buy now click bio link #invest #crypto",
        "followers": 334, "posted_at": "Recent",
    },
    {
        "username": "@john_real_user", "platform": "Twitter",
        "content": "Had a great morning run today! Beautiful weather in Mumbai.",
        "followers": 892, "posted_at": "Recent",
    },
    {
        "username": "@tech_news_daily", "platform": "Twitter",
        "content": "New AI model released by OpenAI showing impressive results on benchmarks.",
        "followers": 4521, "posted_at": "Recent",
    },
]

# Minimum semantic_similarity_score (0-100) to flag a corpus match.
# Calibrated 2026-09-07: spam-spam pairs score 61-100; genuine-spam/genuine-genuine
# score ≤56. Threshold 60.0 sits cleanly in the gap.
SEMANTIC_SCAN_THRESHOLD = 60.0


def scan_similarity(text: str, threshold: float = 0.6) -> dict:
    """
    Scan text against BENCHMARK_POST_CORPUS using semantic similarity.

    The legacy `threshold` parameter (0.0-1.0 fraction for the old literal metric)
    is accepted for backward compatibility but ignored — the engine now uses
    SEMANTIC_SCAN_THRESHOLD (60.0 on a 0-100 scale) for all comparisons.

    Each match now reports both text_overlap_score and semantic_similarity_score
    so the AI narrator can surface the "textually different but semantically
    identical" pattern that the old literal scanner missed entirely.

    Returns the same dict shape as before, with two extra keys per match:
      text_overlap_score        — for narrative contrast
      semantic_similarity_score — primary ranking score
    """
    matches = []
    for post in BENCHMARK_POST_CORPUS:
        scores = similarity_scores(text, post["content"])
        sem = scores["semantic_similarity_score"]
        if sem >= SEMANTIC_SCAN_THRESHOLD:
            risk = "high" if sem >= 85 else "medium" if sem >= 70 else "low"
            matches.append({
                **post,
                "similarity": sem,                                    # primary ranking key
                "text_overlap_score": scores["text_overlap_score"],
                "semantic_similarity_score": sem,
                "risk": risk,
            })

    matches.sort(key=lambda x: x["semantic_similarity_score"], reverse=True)
    avg_sim = (
        round(sum(m["semantic_similarity_score"] for m in matches) / len(matches), 1)
        if matches else 0
    )
    verdict = (
        "Coordinated Bot Activity" if len(matches) >= 3
        else "Suspicious" if len(matches) >= 1
        else "No Matches Found"
    )
    return {
        "total_matches": len(matches),
        "average_similarity": avg_sim,
        "verdict": verdict,
        "algorithm": "Semantic Embedding (bge-small-en-v1.5) + TF-IDF/SequenceMatcher",
        "matches": matches,
    }
