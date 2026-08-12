import re
from difflib import SequenceMatcher

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'#\w+', '', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def similarity_score(a: str, b: str) -> float:
    a_clean = clean_text(a)
    b_clean = clean_text(b)
    return round(SequenceMatcher(None, a_clean, b_clean).ratio() * 100, 1)

SAMPLE_POSTS = [
    {"username": "@bot_spam_01", "platform": "Twitter", "content": "BUY NOW crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #invest #money", "followers": 89, "posted_at": "2026-07-04 03:14 AM"},
    {"username": "@crypto_army_x", "platform": "Twitter", "content": "BUY NOW crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #invest", "followers": 112, "posted_at": "2026-07-04 03:16 AM"},
    {"username": "@pump_signal_99", "platform": "Twitter", "content": "buy now crypto guaranteed 1000x returns click link in bio #crypto #bitcoin #money", "followers": 67, "posted_at": "2026-07-04 03:17 AM"},
    {"username": "@invest_now_fast", "platform": "Instagram", "content": "BUY NOW! crypto guaranteed returns 1000x click link in bio #invest #money #rich", "followers": 203, "posted_at": "2026-07-04 03:19 AM"},
    {"username": "@crypto_blast_22", "platform": "Twitter", "content": "BUY NOW crypto 1000x guaranteed returns click link in bio #crypto #bitcoin", "followers": 45, "posted_at": "2026-07-04 03:21 AM"},
    {"username": "@moon_shot_alert", "platform": "Twitter", "content": "Crypto guaranteed 1000x BUY NOW link in bio #bitcoin #invest #money #crypto", "followers": 178, "posted_at": "2026-07-04 03:25 AM"},
    {"username": "@daily_signal_bot", "platform": "Instagram", "content": "Guaranteed crypto returns 1000x buy now click bio link #invest #crypto", "followers": 334, "posted_at": "2026-07-04 03:31 AM"},
    {"username": "@john_real_user", "platform": "Twitter", "content": "Had a great morning run today! Beautiful weather in Mumbai.", "followers": 892, "posted_at": "2026-07-04 08:00 AM"},
    {"username": "@tech_news_daily", "platform": "Twitter", "content": "New AI model released by OpenAI showing impressive results on benchmarks.", "followers": 4521, "posted_at": "2026-07-04 10:30 AM"},
]

def scan_similarity(text: str, threshold: float = 0.6) -> dict:
    matches = []
    for post in SAMPLE_POSTS:
        score = similarity_score(text, post["content"])
        if score >= threshold * 100:
            risk = "high" if score >= 85 else "medium" if score >= 70 else "low"
            matches.append({
                **post,
                "similarity": score,
                "risk": risk,
            })
    matches.sort(key=lambda x: x["similarity"], reverse=True)
    avg_sim = round(sum(m["similarity"] for m in matches) / len(matches), 1) if matches else 0
    verdict = "Coordinated Bot Activity" if len(matches) >= 3 else "Suspicious" if len(matches) >= 1 else "No Matches Found"
    return {
        "total_matches": len(matches),
        "average_similarity": avg_sim,
        "verdict": verdict,
        "matches": matches,
    }
