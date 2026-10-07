"""
twitter_service.py — live Twitter/X profile fetcher.

Fetch strategy (in order):
  1. Twitter Syndication NEXT_DATA JSON  (free, gives tweet-level data for active accounts)
  2. x.com OpenGraph meta-tag scrape     (free, gives follower/following/joined for most accounts)
  3. RapidAPI real-time scraper          (paid — only used if RAPIDAPI_KEY is set in .env)

The RapidAPI key MUST be set in .env as RAPIDAPI_KEY=<your_key>.
There is intentionally no hardcoded fallback — if the key isn't set, strategies 1 and 2
are tried first; strategy 3 is simply skipped. Do NOT add a hardcoded default here.
"""

import json
import os
import re
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from dotenv import load_dotenv

def _get_rapidapi_key() -> str:
    return os.getenv("RAPIDAPI_KEY", "")

RAPIDAPI_HOST = "real-time-twitter-data-scraper.p.rapidapi.com"

# ---------------------------------------------------------------------------
# Simple in-memory TTL cache (10-minute expiry, resets on server restart)
# ---------------------------------------------------------------------------
_CACHE: dict[str, tuple[dict, float]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes


def _cache_get(key: str) -> dict | None:
    if key in _CACHE:
        payload, expires_at = _CACHE[key]
        if time.monotonic() < expires_at:
            return payload
        del _CACHE[key]
    return None


def _cache_set(key: str, value: dict) -> None:
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL_SECONDS)




def parse_number(val: str) -> int:
    """Parse a Twitter-formatted count string ('1.2K', '4.5M', '230') to int."""
    if not val:
        return 0
    s = str(val).replace(",", "").strip()
    try:
        if s.lower().endswith("k"):
            return int(float(s[:-1]) * 1_000)
        if s.lower().endswith("m"):
            return int(float(s[:-1]) * 1_000_000)
        if s.lower().endswith("b"):
            return int(float(s[:-1]) * 1_000_000_000)
        return int(float(s))
    except (ValueError, TypeError):
        return 0


def _build_result(clean: str, name: str, followers: int, following: int,
                  tweet_count: int, bio: str, location: str, verified: bool,
                  profile_image: str, account_age_days: int,
                  avg_hashtags: float, likes_per_post: float,
                  recent_posts: list,
                  engagement_data_available: bool = True,
                  dataset_source: str = "live_twitter") -> dict:
    posts_per_day = round(tweet_count / max(account_age_days, 1), 2)
    return {
        "found": True,
        "source": dataset_source,
        "username": clean,
        "name": name,
        "platform": "Twitter",
        "followers": followers,
        "following": following,
        "posts": tweet_count,
        "bio": bio,
        "account_age_days": account_age_days,
        "avg_hashtags": avg_hashtags,
        "likes_per_post": likes_per_post,
        "posts_per_day": posts_per_day,
        "verified": verified,
        "location": location,
        "profile_image": profile_image,
        "recent_posts": recent_posts,
        "label": "unknown",
        "dataset_source": dataset_source,
        "engagement_data_available": engagement_data_available,
    }


def _parse_created_at(created_at: str) -> int:
    """Return account age in days from a Twitter API 'created_at' string."""
    try:
        dt = datetime.strptime(created_at, "%a %b %d %H:%M:%S +0000 %Y").replace(tzinfo=timezone.utc)
        return max(1, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return 365


def _parse_joined_meta(raw_desc: str) -> int:
    """Return account age in days from an OG-description 'Joined Mon YYYY' string."""
    m = re.search(r"Joined\s+([A-Za-z]+\s+\d{4})", raw_desc)
    if m:
        try:
            joined_dt = datetime.strptime(m.group(1), "%b %Y").replace(tzinfo=timezone.utc)
            return max(1, (datetime.now(timezone.utc) - joined_dt).days)
        except Exception:
            pass
    return 365


# ---------------------------------------------------------------------------
# Presets for high-profile accounts & demo accounts
# Ensures accurate profile data even if Twitter API / scrapers fail or rate-limit
# ---------------------------------------------------------------------------
def _build_preset(**kwargs) -> dict:
    kwargs["dataset_source"] = "preset_profile"
    return _build_result(**kwargs)

PRESET_PROFILES: dict[str, dict] = {
    "narendramodi": _build_preset(
        clean="narendramodi",
        name="Narendra Modi",
        followers=106_000_000,
        following=350,
        tweet_count=35_400,
        bio="Prime Minister of India",
        location="New Delhi, India",
        verified=True,
        profile_image="https://pbs.twimg.com/profile_images/2054240470503673859/KGxxrUga_200x200.jpg",
        account_age_days=5800,
        avg_hashtags=0.8,
        likes_per_post=15000.0,
        recent_posts=[
            {"content": "Remembering all those who participated in the historic Quit India Movement. Their courage will always remain an inspiration.", "likes": 24500, "time": "Recent"},
            {"content": "Deeply touched by the warm welcome from the Indian community. This affection reflects the enduring bond.", "likes": 18200, "time": "Recent"},
            {"content": "Pleased to meet senior security officials. In a changing global landscape, we must address shared challenges together.", "likes": 12400, "time": "Recent"},
        ],
    ),
    "elonmusk": _build_preset(
        clean="elonmusk",
        name="Elon Musk",
        followers=210_000_000,
        following=850,
        tweet_count=52_000,
        bio="Technoking of Tesla, Owner of X",
        location="Austin, TX",
        verified=True,
        profile_image="https://pbs.twimg.com/profile_images/1683325380441128960/yRs3n2lJ_200x200.jpg",
        account_age_days=5500,
        avg_hashtags=0.2,
        likes_per_post=45000.0,
        recent_posts=[
            {"content": "Starship launch attempt coming up soon!", "likes": 85000, "time": "Recent"},
            {"content": "Free speech is the bedrock of a functioning democracy.", "likes": 120000, "time": "Recent"},
        ],
    ),
    "realdonaldtrump": _build_preset(
        clean="realdonaldtrump",
        name="Donald J. Trump",
        followers=95_000_000,
        following=51,
        tweet_count=28_000,
        bio="45th and 47th President of the United States of America",
        location="Palm Beach, FL",
        verified=True,
        profile_image="",
        account_age_days=5300,
        avg_hashtags=0.5,
        likes_per_post=55000.0,
        recent_posts=[
            {"content": "MAKE AMERICA GREAT AGAIN!", "likes": 150000, "time": "Recent"},
        ],
    ),
    "barackobama": _build_preset(
        clean="barackobama",
        name="Barack Obama",
        followers=131_000_000,
        following=560_000,
        tweet_count=17_000,
        bio="Dad, husband, President, citizen.",
        location="Washington, DC",
        verified=True,
        profile_image="",
        account_age_days=6200,
        avg_hashtags=0.4,
        likes_per_post=35000.0,
        recent_posts=[
            {"content": "Michelle and I are wishing everyone a restful weekend.", "likes": 42000, "time": "Recent"},
        ],
    ),
    "billgates": _build_preset(
        clean="billgates",
        name="Bill Gates",
        followers=64_000_000,
        following=550,
        tweet_count=4_200,
        bio="Co-chair of the Bill & Melinda Gates Foundation. Marketer of books. World traveler.",
        location="Seattle, WA",
        verified=True,
        profile_image="",
        account_age_days=5600,
        avg_hashtags=1.1,
        likes_per_post=8500.0,
        recent_posts=[
            {"content": "Innovations in global health continue to inspire me every single day.", "likes": 12000, "time": "Recent"},
        ],
    ),
    "taylorswift13": _build_preset(
        clean="taylorswift13",
        name="Taylor Swift",
        followers=95_000_000,
        following=0,
        tweet_count=820,
        bio="The Official Twitter for Taylor Swift",
        location="Nashville, TN",
        verified=True,
        profile_image="",
        account_age_days=5800,
        avg_hashtags=0.3,
        likes_per_post=180000.0,
        recent_posts=[
            {"content": "See you on tour!", "likes": 250000, "time": "Recent"},
        ],
    ),
    "shadow_bot_99": _build_preset(
        clean="shadow_bot_99",
        name="Shadow Bot 99",
        followers=42,
        following=4800,
        tweet_count=3200,
        bio="Follow back 100% | DM for cheap crypto promo & giveaways #f4f #crypto",
        location="Unknown",
        verified=False,
        profile_image="",
        account_age_days=35,
        avg_hashtags=18.5,
        likes_per_post=0.2,
        recent_posts=[
            {"content": "BUY NOW crypto guaranteed 1000x returns #crypto #bitcoin #invest #money", "likes": 1, "time": "3:14 AM"},
            {"content": "CLICK LINK IN BIO for free giveaway #giveaway #free #win #followback", "likes": 0, "time": "3:16 AM"},
            {"content": "Follow me follow back #followforfollow #follow #f4f #like4like", "likes": 1, "time": "4:02 AM"},
        ],
    ),
    "crypto_pump_bot": _build_preset(
        clean="crypto_pump_bot",
        name="Crypto Pump Alert Bot",
        followers=85,
        following=3900,
        tweet_count=4500,
        bio="Automated crypto signal & pump alert bot! FREE SIGNALS! DM for VIP access",
        location="Unknown",
        verified=False,
        profile_image="",
        account_age_days=22,
        avg_hashtags=22.0,
        likes_per_post=0.1,
        recent_posts=[
            {"content": "PUMP ALERT NEXT 100X GEM #crypto #solana #binance #airdrop", "likes": 0, "time": "1:00 AM"},
            {"content": "JOIN TELEGRAM FOR INSIDER PUMP #btc #eth #memecoin", "likes": 0, "time": "1:02 AM"},
        ],
    ),
    "john_doe_real": _build_preset(
        clean="john_doe_real",
        name="John Doe",
        followers=1450,
        following=520,
        tweet_count=840,
        bio="Software Developer | Coffee Enthusiast | Open Source Contributor",
        location="San Francisco, CA",
        verified=False,
        profile_image="",
        account_age_days=1400,
        avg_hashtags=2.1,
        likes_per_post=42.0,
        recent_posts=[
            {"content": "Shipped a major release today! Feels great to solve complex architecture challenges.", "likes": 65, "time": "Yesterday"},
            {"content": "Morning coffee & code review routine.", "likes": 32, "time": "3 days ago"},
        ],
    ),
    "news_spreader": _build_preset(
        clean="news_spreader",
        name="Global News Flash Bot",
        followers=180,
        following=3200,
        tweet_count=5400,
        bio="Automated rapid news aggregator. Breaking shock news 24/7!",
        location="Unknown",
        verified=False,
        profile_image="",
        account_age_days=45,
        avg_hashtags=14.0,
        likes_per_post=0.3,
        recent_posts=[
            {"content": "SHOCKING NEWS BREAKING NOW YOU WONT BELIEVE THIS #breaking #news #viral", "likes": 0, "time": "2:10 AM"},
        ],
    ),
    "nakulpradip": _build_preset(
        clean="nakulpradip",
        name="Nakul Indurkar",
        followers=450,
        following=380,
        tweet_count=310,
        bio="Software Engineer & AI Researcher | Building ForensIQ",
        location="Mumbai, India",
        verified=False,
        profile_image="",
        account_age_days=1200,
        avg_hashtags=1.5,
        likes_per_post=25.0,
        recent_posts=[
            {"content": "Building ML classifiers for social threat forensics!", "likes": 35, "time": "Recent"},
        ],
    ),
    "satyanadella": _build_preset(
        clean="satyanadella",
        name="Satya Nadella",
        followers=3_200_000,
        following=240,
        tweet_count=2_800,
        bio="Chairman and CEO of Microsoft",
        location="Redmond, WA",
        verified=True,
        profile_image="",
        account_age_days=5200,
        avg_hashtags=0.6,
        likes_per_post=4200.0,
        recent_posts=[
            {"content": "Excited about the possibilities of AI in transforming industries and empowering every person.", "likes": 5400, "time": "Recent"},
        ],
    ),
    "sundarpichai": _build_preset(
        clean="sundarpichai",
        name="Sundar Pichai",
        followers=5_400_000,
        following=310,
        tweet_count=3_500,
        bio="CEO of Alphabet and Google",
        location="Mountain View, CA",
        verified=True,
        profile_image="",
        account_age_days=5400,
        avg_hashtags=0.5,
        likes_per_post=6800.0,
        recent_posts=[
            {"content": "Reflecting on our latest AI innovations and how technology helps people everywhere.", "likes": 8200, "time": "Recent"},
        ],
    ),
    "tim_cook": _build_preset(
        clean="tim_cook",
        name="Tim Cook",
        followers=14_500_000,
        following=65,
        tweet_count=1_400,
        bio="CEO of Apple",
        location="Cupertino, CA",
        verified=True,
        profile_image="",
        account_age_days=4800,
        avg_hashtags=0.3,
        likes_per_post=15000.0,
        recent_posts=[
            {"content": "Thrilled to share our latest product updates with our incredible community.", "likes": 22000, "time": "Recent"},
        ],
    ),
    "samaltman": _build_preset(
        clean="samaltman",
        name="Sam Altman",
        followers=3_800_000,
        following=800,
        tweet_count=8_500,
        bio="CEO of OpenAI",
        location="San Francisco, CA",
        verified=True,
        profile_image="",
        account_age_days=5100,
        avg_hashtags=0.4,
        likes_per_post=12000.0,
        recent_posts=[
            {"content": "Super excited for what we are building next.", "likes": 18000, "time": "Recent"},
        ],
    ),
}

def DEBUG_LOG(msg: str):
    if os.getenv("TWITTER_DEBUG", "").lower() in ("1", "true", "yes"):
        print(f"[DEBUG_TWITTER] {msg}")

def _is_valid_profile_result(res: dict | None) -> bool:
    """
    Sanity-check guard: check if a fetched profile dict contains internally
    inconsistent or implausible scraped data (e.g. 50,000+ followers with 0 posts
    AND 0 following on a non-preset account).
    """
    if not res or not res.get("found"):
        return False

    followers = res.get("followers", 0)
    following = res.get("following", 0)
    posts = res.get("posts", 0)

    # Implausible anomaly: high follower count (>= 10,000) with 0 following AND 0 posts
    # (Real high-follower accounts almost always have posts or followings).
    if followers >= 10_000 and following == 0 and posts == 0:
        DEBUG_LOG(f"Sanity check FAILED for profile @{res.get('username')}: followers={followers} but following=0 and posts=0")
        return False

    return True

# ---------------------------------------------------------------------------
# Strategy 1: Twitter Syndication NEXT_DATA JSON
# ---------------------------------------------------------------------------
def _strategy_syndication(clean: str) -> dict | None:
    DEBUG_LOG(f"Attempting Strategy: Syndication for '@{clean}'...")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        url = f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{clean}"
        res = requests.get(url, headers=headers, timeout=8)
        DEBUG_LOG(f"Syndication HTTP status: {res.status_code}")
        if res.status_code != 200:
            DEBUG_LOG("Syndication failed: HTTP status != 200")
            return None

        soup = BeautifulSoup(res.text, "html.parser")
        script = soup.find("script", id="__NEXT_DATA__")
        if not script or not script.string:
            DEBUG_LOG("Syndication failed: __NEXT_DATA__ script tag not found")
            return None

        data = json.loads(script.string)
        entries = data.get("props", {}).get("pageProps", {}).get("timeline", {}).get("entries", [])
        if not entries:
            DEBUG_LOG("Syndication failed: no timeline entries in __NEXT_DATA__")
            return None

        user = entries[0].get("content", {}).get("tweet", {}).get("user", {})
        if not user:
            DEBUG_LOG("Syndication failed: no user object in first timeline entry")
            return None

        recent_posts = []
        total_likes = total_hashtags = 0
        for e in entries[:10]:
            tw = e.get("content", {}).get("tweet", {})
            text = tw.get("text", "")
            likes = tw.get("favorite_count", 0)
            if text:
                recent_posts.append({"content": text[:200], "likes": likes, "time": tw.get("created_at", "Recent")})
                total_likes += likes
                total_hashtags += text.count("#")

        count = max(len(recent_posts), 1)
        res_dict = _build_result(
            clean=clean,
            name=user.get("name", clean),
            followers=user.get("followers_count", 0),
            following=user.get("friends_count", 0),
            tweet_count=user.get("statuses_count", 0),
            bio=user.get("description", ""),
            location=user.get("location", "Unknown") or "Unknown",
            verified=user.get("verified", False) or user.get("is_blue_verified", False),
            profile_image=user.get("profile_image_url_https", ""),
            account_age_days=_parse_created_at(user.get("created_at", "")),
            avg_hashtags=round(total_hashtags / count, 2),
            likes_per_post=round(total_likes / count, 2),
            recent_posts=recent_posts,
        )
        DEBUG_LOG(f"Syndication SUCCESS: result={res_dict}")
        return res_dict
    except Exception as e:
        DEBUG_LOG(f"Syndication strategy EXCEPTION for @{clean}: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 2: x.com OpenGraph meta-tag scrape
# ---------------------------------------------------------------------------
def _strategy_og_meta(clean: str) -> dict | None:
    DEBUG_LOG(f"Attempting Strategy: OG-Meta for '@{clean}'...")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        url = f"https://x.com/{clean}"
        res = requests.get(url, headers=headers, timeout=8)
        DEBUG_LOG(f"OG-Meta HTTP status: {res.status_code} for URL: {res.url}")
        if res.status_code != 200:
            DEBUG_LOG("OG-Meta failed: HTTP status != 200")
            return None

        soup = BeautifulSoup(res.text, "html.parser")
        title_meta = soup.find("meta", property="og:title")
        desc_meta = soup.find("meta", property="og:description")
        image_meta = soup.find("meta", property="og:image")

        raw_title = (title_meta or {}).get("content", "") if title_meta else ""
        raw_desc = (desc_meta or {}).get("content", "") if desc_meta else ""
        profile_image = (image_meta or {}).get("content", "") if image_meta else ""

        DEBUG_LOG(f"OG-Meta raw_title: {raw_title!r}")
        DEBUG_LOG(f"OG-Meta raw_desc: {raw_desc!r}")

        if not raw_title or "User Profile Not Found" in raw_title or "404" in raw_title:
            DEBUG_LOG("OG-Meta failed: Title empty or indicates 404/Not Found")
            return None

        name_m = re.search(r"^(.*?)\s*\(@", raw_title)
        name = name_m.group(1).strip() if name_m else clean

        followers_m = re.search(r"([\d.,KMBkmb]+)\s+followers", raw_desc)
        following_m = re.search(r"([\d.,KMBkmb]+)\s+following", raw_desc)
        followers = parse_number(followers_m.group(1)) if followers_m else 0
        following = parse_number(following_m.group(1)) if following_m else 0
        account_age_days = _parse_joined_meta(raw_desc)

        DEBUG_LOG(f"OG-Meta parsed -> name={name!r}, followers={followers}, following={following}, age={account_age_days}")

        res_dict = _build_result(
            clean=clean,
            name=name,
            followers=followers,
            following=following,
            tweet_count=0,
            bio=raw_desc or f"Twitter account @{clean}",
            location="Unknown",
            verified="verified" in raw_title.lower(),
            profile_image=profile_image,
            account_age_days=account_age_days,
            avg_hashtags=0.0,
            likes_per_post=0.0,
            recent_posts=[],
            engagement_data_available=False,
        )
        DEBUG_LOG(f"OG-Meta SUCCESS: result={res_dict}")
        return res_dict
    except Exception as e:
        DEBUG_LOG(f"OG-Meta strategy EXCEPTION for @{clean}: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 3: RapidAPI real-time Twitter scraper
# ---------------------------------------------------------------------------
def _strategy_rapidapi(clean: str) -> dict | None:
    DEBUG_LOG(f"Attempting Strategy: RapidAPI for '@{clean}'...")
    api_key = _get_rapidapi_key()
    if not api_key:
        DEBUG_LOG("RapidAPI skipped: No RAPIDAPI_KEY set")
        return None
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Content-Type": "application/json",
    }
    try:
        res = requests.get(
            f"https://{RAPIDAPI_HOST}/v2/UserByScreenName/?username={clean}",
            headers=headers,
            timeout=12,
        )
        DEBUG_LOG(f"RapidAPI HTTP status: {res.status_code}")
        if res.status_code != 200:
            return None

        data = res.json()
        user = data.get("data", {}).get("user", {}).get("result") or data.get("user")
        if not user:
            DEBUG_LOG("RapidAPI failed: No user object in JSON response")
            return None

        legacy = user.get("legacy", user)
        tweet_count = legacy.get("statuses_count", 0)
        created_at = legacy.get("created_at", "")
        account_age_days = _parse_created_at(created_at) if created_at else 730

        res_dict = _build_result(
            clean=clean,
            name=legacy.get("name", clean),
            followers=legacy.get("followers_count", 0),
            following=legacy.get("friends_count", 0),
            tweet_count=tweet_count,
            bio=legacy.get("description", ""),
            location=legacy.get("location", "Unknown") or "Unknown",
            verified=legacy.get("verified", False) or user.get("is_blue_verified", False),
            profile_image=legacy.get("profile_image_url_https", ""),
            account_age_days=account_age_days,
            avg_hashtags=0.0,
            likes_per_post=0.0,
            recent_posts=[],
        )
        DEBUG_LOG(f"RapidAPI SUCCESS: result={res_dict}")
        return res_dict
    except Exception as e:
        DEBUG_LOG(f"RapidAPI strategy EXCEPTION for @{clean}: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 4: DuckDuckGo Search Scrape Fallback
# ---------------------------------------------------------------------------
def _strategy_search_scrape(clean: str) -> dict | None:
    DEBUG_LOG(f"Attempting Strategy: Search-Scrape for '@{clean}'...")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        url = f"https://html.duckduckgo.com/html/?q=site:twitter.com+{clean}+followers"
        res = requests.get(url, headers=headers, timeout=8)
        DEBUG_LOG(f"Search-Scrape HTTP status: {res.status_code}")
        if res.status_code != 200:
            DEBUG_LOG("Search-Scrape failed: HTTP status != 200")
            return None

        soup = BeautifulSoup(res.text, "html.parser")
        snippets = " ".join([a.text for a in soup.find_all("a", class_="result__snippet")])
        DEBUG_LOG(f"Search-Scrape raw snippets (first 300 chars): {snippets[:300]!r}")
        if not snippets:
            DEBUG_LOG("Search-Scrape failed: No snippets found")
            return None

        # Require explicit mention of the follower/following count attached to Followers keyword
        followers_m = re.search(r"([\d.,]+[KMBkmb]?)\s+[Ff]ollowers", snippets)
        following_m = re.search(r"([\d.,]+[KMBkmb]?)\s+[Ff]ollowing", snippets)

        followers = parse_number(followers_m.group(1)) if followers_m else 0
        following = parse_number(following_m.group(1)) if following_m else 0

        DEBUG_LOG(f"Search-Scrape followers_m: {followers_m.groups() if followers_m else None}, parsed: {followers}")
        DEBUG_LOG(f"Search-Scrape following_m: {following_m.groups() if following_m else None}, parsed: {following}")

        if followers == 0 and following == 0:
            DEBUG_LOG("Search-Scrape failed: Both followers and following parsed to 0 (no explicit count found)")
            return None

        name_m = re.search(rf"([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(@?{clean}\)?", snippets, re.I)
        name = name_m.group(1).strip() if name_m else clean.capitalize()

        res_dict = _build_result(
            clean=clean,
            name=name,
            followers=followers,
            following=following,
            tweet_count=0,
            bio=f"Twitter account @{clean}",
            location="Unknown",
            verified=followers > 100_000,
            profile_image="",
            account_age_days=1000 if followers > 1000 else 365,
            avg_hashtags=0.0,
            likes_per_post=0.0,
            recent_posts=[],
            engagement_data_available=False,
        )
        DEBUG_LOG(f"Search-Scrape SUCCESS: result={res_dict}")
        return res_dict
    except Exception as e:
        DEBUG_LOG(f"Search-Scrape strategy EXCEPTION for @{clean}: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 1: Real-Time Live Twitter/X API via fxTwitter
# ---------------------------------------------------------------------------
def _strategy_fxtwitter(clean: str) -> dict | None:
    DEBUG_LOG(f"Attempting Strategy: fxTwitter for '@{clean}'...")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    try:
        url = f"https://api.fxtwitter.com/{clean}"
        res = requests.get(url, headers=headers, timeout=6)
        DEBUG_LOG(f"fxTwitter HTTP status: {res.status_code}")
        if res.status_code != 200:
            DEBUG_LOG(f"fxTwitter failed: HTTP status {res.status_code}")
            return None

        data = res.json()
        DEBUG_LOG(f"fxTwitter raw response JSON code: {data.get('code')}")
        if data.get("code") != 200:
            DEBUG_LOG(f"fxTwitter failed: code != 200 in JSON (message: {data.get('message')})")
            return None

        u = data.get("user")
        if not u:
            DEBUG_LOG("fxTwitter failed: No 'user' key in JSON response")
            return None

        DEBUG_LOG(f"fxTwitter raw user dictionary: {u}")

        followers = int(u.get("followers", 0))
        following = int(u.get("following", 0))
        tweets = int(u.get("tweets", 0))
        bio = str(u.get("description", "") or "").strip()
        location = str(u.get("location") or "Unknown").strip() or "Unknown"
        raw_avatar = str(u.get("avatar_url") or "").strip()
        profile_image = raw_avatar.replace("_normal.", "_200x200.")

        joined = str(u.get("joined", "") or "")
        account_age_days = _parse_created_at(joined) if joined else 365

        ver_dict = u.get("verification", {}) or {}
        verified = bool(ver_dict.get("verified", False) or ver_dict.get("type") == "individual")

        # NOTE: fxTwitter's `likes` field is the total number of tweets this user
        # has LIKED (given to others) — it is NOT engagement received on their own posts.
        # Using it as likes_per_post would produce completely wrong values (e.g. Elon
        # gets 2.28 instead of hundreds of thousands). Since we have no per-post
        # engagement data from this endpoint, we set engagement_data_available=False
        # so the rule-based scorer skips engagement-dependent rules.
        #
        # Similarly, this endpoint returns user metadata only — no recent tweet content.
        # All tweet-content features (hashtag count, template score, url density, etc.)
        # will be zero, which is correct — mark engagement unavailable so heuristics
        # don't penalise the account for "near-zero engagement despite sizeable followers".

        res_dict = _build_result(
            clean=clean,
            name=u.get("name", clean),
            followers=followers,
            following=following,
            tweet_count=tweets,
            bio=bio,
            location=location,
            verified=verified,
            profile_image=profile_image,
            account_age_days=account_age_days,
            avg_hashtags=0.0,
            likes_per_post=0.0,
            recent_posts=[],
            engagement_data_available=False,
        )
        DEBUG_LOG(f"fxTwitter SUCCESS: result={res_dict}")
        return res_dict
    except Exception as e:
        DEBUG_LOG(f"fxTwitter strategy EXCEPTION for @{clean}: {e}")
        return None


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------
def fetch_twitter_profile(username: str) -> dict:
    raw = username.lstrip("@").strip().lower()
    clean = raw
    DEBUG_LOG(f"=== fetch_twitter_profile called for '{raw}' ===")

    cache_key = f"profile:{clean}"
    cached = _cache_get(cache_key)
    if cached:
        DEBUG_LOG(f"CACHE HIT for key '{cache_key}': {cached}")
        return cached

    DEBUG_LOG(f"Cache miss for '{cache_key}'")

    # Strategy 1 — Try live fxTwitter API first
    result = _strategy_fxtwitter(clean)
    if not _is_valid_profile_result(result):
        result = None

    # Strategy 2 — Presets for known demo / synthetic profiles
    if result is None and clean in PRESET_PROFILES:
        DEBUG_LOG(f"Returning PRESET profile for '@{clean}'")
        result = PRESET_PROFILES[clean]

    # Strategy 3 — RapidAPI / Syndication / OG meta / Search fallback
    if result is None:
        api_key = _get_rapidapi_key()
        if api_key:
            res = _strategy_rapidapi(clean)
            if _is_valid_profile_result(res):
                result = res

    if result is None:
        res = _strategy_syndication(clean)
        if _is_valid_profile_result(res):
            result = res

    if result is None:
        res = _strategy_og_meta(clean)
        if _is_valid_profile_result(res):
            result = res

    if result is None:
        res = _strategy_search_scrape(clean)
        if _is_valid_profile_result(res):
            result = res

    # Fallback to variant handles if needed
    if result is None:
        fallback = re.sub(r"[\d_]+$", "", raw)
        DEBUG_LOG(f"All strategies failed for '{clean}'. Checking fallback handle: '{fallback}'...")
        if fallback and fallback != clean and len(fallback) >= 3:
            res = _strategy_fxtwitter(fallback)
            if _is_valid_profile_result(res):
                result = res
            elif fallback in PRESET_PROFILES:
                DEBUG_LOG(f"Returning PRESET profile for fallback handle '@{fallback}'")
                result = PRESET_PROFILES[fallback]

    if result is None:
        DEBUG_LOG(f"ALL strategies FAILED for '@{raw}'")
        return {"found": False, "error": f"Profile @{raw} not found on Twitter/X"}

    # ── Supplementary Syndication backfill for recent_posts ─────────────────
    # Most primary strategies (fxTwitter, RapidAPI, OG-meta) return only user
    # metadata — they hard-code recent_posts=[]. Syndication is the only
    # strategy that actually fetches tweet text. If the primary strategy
    # resolved the profile but left recent_posts empty, try a supplementary
    # Syndication call specifically to backfill post content.
    #
    # Contract:
    #   - All metadata from the primary strategy is preserved as-is.
    #   - Only recent_posts (and its derived metrics avg_hashtags /
    #     likes_per_post) are merged in from Syndication, and only when
    #     Syndication returns a non-empty list.
    #   - If Syndication also fails or returns nothing, recent_posts stays [].
    #   - This runs on every resolution path, including presets that were
    #     resolved from db.profiles (they may already have posts, in which
    #     case the guard below short-circuits immediately).
    if result.get("found") and not result.get("recent_posts"):
        DEBUG_LOG(f"Primary strategy returned empty recent_posts for @{clean} — trying Syndication backfill")
        try:
            syn = _strategy_syndication(clean)
            if syn and syn.get("recent_posts"):
                result = dict(result)   # don't mutate the original
                result["recent_posts"] = syn["recent_posts"]
                # Merge engagement metrics derived from the posts
                if syn.get("avg_hashtags", 0.0) > 0:
                    result["avg_hashtags"] = syn["avg_hashtags"]
                if syn.get("likes_per_post", 0.0) > 0:
                    result["likes_per_post"] = syn["likes_per_post"]
                DEBUG_LOG(
                    f"Syndication backfill SUCCESS for @{clean}: "
                    f"{len(result['recent_posts'])} posts backfilled"
                )
            else:
                DEBUG_LOG(f"Syndication backfill returned nothing for @{clean} — keeping recent_posts=[]")
        except Exception as e:
            # Never let a failed backfill kill the primary result
            DEBUG_LOG(f"Syndication backfill EXCEPTION for @{clean}: {e} — ignoring")

    DEBUG_LOG(f"FINAL RESULT for '@{raw}': {result}")
    _cache_set(cache_key, result)
    return result

