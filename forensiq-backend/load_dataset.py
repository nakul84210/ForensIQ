
import csv
import random
import os
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "forensiq"
DATASET_FILE = os.path.join(os.path.dirname(__file__), "cresci_dataset.csv")

BOT_BIOS = [
    "Follow back 100%! DM for crypto promo #f4f",
    "DM for promo",
    "Automated news signal & bot alerts",
    "Crypto signals | 1000x gains | DM now",
    "",
]

REAL_BIOS = [
    "Software Engineer | Mumbai | Love coding and coffee",
    "Photographer | Travel enthusiast | India",
    "Final year CS student | Building cool stuff",
    "Cricket fan | Foodie | Mumbai",
    "Data Scientist | ML enthusiast | Python lover",
    "Full stack developer | React + Node | Open source",
    "Just a regular person sharing thoughts",
    "Journalist | Opinions my own",
]

BOT_POSTS = [
    {"content": "BUY NOW crypto guaranteed 1000x returns #crypto #bitcoin #invest #money", "likes": random.randint(0, 3), "time": "3:14 AM"},
    {"content": "CLICK LINK IN BIO for free giveaway #giveaway #free #win #followback", "likes": random.randint(0, 2), "time": "3:16 AM"},
    {"content": "Follow me follow back #followforfollow #follow #f4f #like4like", "likes": random.randint(0, 1), "time": "4:02 AM"},
]

REAL_POSTS = [
    {"content": "Had a great day at work! Finally fixed that bug I've been chasing for 3 days", "likes": random.randint(15, 150), "time": "10:30 AM"},
    {"content": "Beautiful sunset today. Nature never disappoints 🌅", "likes": random.randint(20, 200), "time": "7:45 PM"},
    {"content": "Just finished reading Clean Code by Robert Martin. Highly recommend!", "likes": random.randint(10, 100), "time": "9:00 PM"},
    {"content": "Coffee + good music = perfect morning ☕🎵", "likes": random.randint(5, 80), "time": "8:00 AM"},
]

def random_date(days_ago):
    return (datetime.now(timezone.utc) - timedelta(days=int(days_ago))).isoformat()

def row_to_profile(row):
    is_bot = row["label"].strip().lower() == "bot"
    followers = int(float(row["followers"]))
    following = int(float(row["following"]))
    posts = int(float(row["tweets"]))
    account_age_days = int(float(row["account_age_days"]))
    avg_hashtags = float(row["avg_hashtags"])
    likes_per_post = float(row["likes_per_post"])
    posts_per_day = float(row["posts_per_day"])
    has_number = int(float(row["has_number_in_name"])) == 1

    return {
        "username": row["username"].strip(),
        "name": row["username"].strip().replace("_", " ").title(),
        "platform": "Twitter",
        "followers": followers,
        "following": following,
        "posts": posts,
        "bio": random.choice(BOT_BIOS) if is_bot else random.choice(REAL_BIOS),
        "account_age_days": account_age_days,
        "avg_hashtags": avg_hashtags,
        "likes_per_post": likes_per_post,
        "posts_per_day": posts_per_day,
        "verified": False if is_bot else random.choice([False, False, False, True]),
        "profile_image": "",
        "location": random.choice(["Unknown", "USA", "Russia"]) if is_bot else random.choice(["Mumbai, India", "Pune, India", "Bangalore, India", "Delhi, India"]),
        "label": "bot" if is_bot else "real",
        "risk_score": round(random.uniform(60, 95), 1) if is_bot else round(random.uniform(10, 40), 1),
        "status": "Fake" if is_bot else "Real",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "created_at": random_date(account_age_days),
        "recent_posts": random.sample(BOT_POSTS, min(3, len(BOT_POSTS))) if is_bot else random.sample(REAL_POSTS, min(3, len(REAL_POSTS))),
        "dataset_source": "cresci_2017",
        "has_number_in_name": has_number,
    }

def load():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    print("Clearing existing profiles...")
    db.profiles.delete_many({})

    profiles = []
    print(f"Loading Cresci 2017 dataset from: {DATASET_FILE}")

    with open(DATASET_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                profiles.append(row_to_profile(row))
            except Exception as e:
                print(f"  Skipping row {row.get('username', '?')}: {e}")

    print(f"Inserting {len(profiles)} profiles from Cresci 2017...")
    db.profiles.insert_many(profiles)
    db.profiles.create_index("username")
    db.profiles.create_index("label")
    db.profiles.create_index("dataset_source")

    bots = db.profiles.count_documents({"label": "bot"})
    real = db.profiles.count_documents({"label": "real"})
    print(f"Done! Cresci 2017 — Bots: {bots} | Real: {real} | Total: {bots + real}")
    client.close()

load()
