
import random
import string
from pymongo import MongoClient
from datetime import datetime, timedelta

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "forensiq"

BOT_USERNAMES = [
    "shadow_bot_99", "crypto_pump_bot", "news_spreader", "crypto_pump_01", "spam_lord_x", "fake_news_99",
    "insta_bot_22", "retweet_farm_7", "follow_back_bot", "auto_post_x",
    "news_spreader_1", "bot_army_x1", "crypto_scam_44", "deepfake_sp",
    "hate_speech_b", "stock_pump_88", "phishing_m4", "disinfo_7",
    "spam_wave_99", "fake_celeb_01", "misinfo_rapid", "bot_cluster_3",
    "auto_retweet9", "like_factory1", "follow_unf_bot", "mass_dm_bot",
    "hashtag_spam7", "trending_bot5", "viral_fake_99", "clone_acc_12",
    "sockpuppet_44", "astroturf_bot",
]

REAL_USERNAMES = [
    "narendramodi", "elonmusk", "barackobama", "billgates", "nakulpradip84",
    "nakul_indurkar", "john_doe_real", "genuine_user22", "normal_person",
    "tech_enthusiast", "mumbai_foodie", "cricket_fan_in", "college_student",
    "software_dev_99", "photography_lv", "travel_blogger", "music_lover_21",
    "fitness_freak_7", "bookworm_india", "startup_founder", "data_scientist",
    "ml_engineer_in", "react_developer", "python_coder_1", "fullstack_dev",
]

def random_date(days_ago):
    return (datetime.utcnow() - timedelta(days=days_ago)).isoformat()

def generate_bot(username):
    age = random.randint(15, 120)
    following = random.randint(2000, 5000)
    followers = random.randint(50, 300)
    posts = random.randint(500, 5000)
    return {
        "username": username,
        "platform": "Twitter",
        "followers": followers,
        "following": following,
        "posts": posts,
        "bio": random.choice(["Follow back 100%! DM for crypto promo #f4f", "DM for promo", "Automated news signal & bot alerts"]),
        "account_age_days": age,
        "avg_hashtags": random.randint(12, 25),
        "likes_per_post": round(random.uniform(0, 2), 2),
        "posts_per_day": round(posts / max(age, 1), 2),
        "verified": False,
        "profile_image": "",
        "location": random.choice(["Unknown", "USA", "Russia", "Nigeria"]),
        "label": "bot",
        "created_at": random_date(age),
        "recent_posts": [
            {"content": "BUY NOW crypto guaranteed 1000x returns #crypto #bitcoin #invest #money", "likes": random.randint(0, 3), "time": "3:14 AM"},
            {"content": "CLICK LINK IN BIO for free giveaway #giveaway #free #win #followback", "likes": random.randint(0, 2), "time": "3:16 AM"},
            {"content": "Follow me follow back #followforfollow #follow #f4f #like4like", "likes": random.randint(0, 1), "time": "4:02 AM"},
        ],
        "dataset_source": "cresci_2017_synthetic",
    }

def generate_real(username):
    if username == "narendramodi":
        return {
            "username": "narendramodi",
            "name": "Narendra Modi",
            "platform": "Twitter",
            "followers": 106000000,
            "following": 350,
            "posts": 35400,
            "bio": "Prime Minister of India",
            "account_age_days": 5800,
            "avg_hashtags": 0.8,
            "likes_per_post": 15000.0,
            "posts_per_day": 6.1,
            "verified": True,
            "profile_image": "https://pbs.twimg.com/profile_images/2054240470503673859/KGxxrUga_200x200.jpg",
            "location": "New Delhi, India",
            "label": "real",
            "created_at": random_date(5800),
            "recent_posts": [
                {"content": "Remembering all those who participated in the historic Quit India Movement. Their courage will always remain an inspiration.", "likes": 24500, "time": "Recent"},
            ],
            "dataset_source": "cresci_2017_synthetic",
        }
    if username == "elonmusk":
        return {
            "username": "elonmusk",
            "name": "Elon Musk",
            "platform": "Twitter",
            "followers": 210000000,
            "following": 850,
            "posts": 52000,
            "bio": "Technoking of Tesla, Owner of X",
            "account_age_days": 5500,
            "avg_hashtags": 0.2,
            "likes_per_post": 45000.0,
            "posts_per_day": 9.4,
            "verified": True,
            "profile_image": "https://pbs.twimg.com/profile_images/1683325380441128960/yRs3n2lJ_200x200.jpg",
            "location": "Austin, TX",
            "label": "real",
            "created_at": random_date(5500),
            "recent_posts": [
                {"content": "Starship launch attempt coming up soon!", "likes": 85000, "time": "Recent"},
            ],
            "dataset_source": "cresci_2017_synthetic",
        }

    age = random.randint(365, 2000)
    following = random.randint(100, 800)
    followers = random.randint(200, 5000)
    posts = random.randint(50, 500)
    bios = [
        "Software Engineer | Mumbai | Love coding and coffee",
        "Photographer | Travel enthusiast | India",
        "Final year CS student | Building cool stuff",
        "Cricket fan | Foodie | Mumbai",
        "Data Scientist | ML enthusiast | Python lover",
        "Full stack developer | React + Node | Open source",
    ]
    return {
        "username": username,
        "platform": "Twitter",
        "followers": followers,
        "following": following,
        "posts": posts,
        "bio": random.choice(bios),
        "account_age_days": age,
        "avg_hashtags": random.randint(1, 5),
        "likes_per_post": round(random.uniform(20, 200), 2),
        "posts_per_day": round(posts / max(age, 1), 2),
        "verified": random.choice([False, False, False, True]),
        "profile_image": "",
        "location": random.choice(["Mumbai, India", "Pune, India", "Bangalore, India"]),
        "label": "real",
        "created_at": random_date(age),
        "recent_posts": [
            {"content": "Had a great day at work! Finally fixed that bug I have been chasing for 3 days", "likes": random.randint(15, 150), "time": "10:30 AM"},
            {"content": "Beautiful sunset today in Mumbai. Nature never disappoints", "likes": random.randint(20, 200), "time": "7:45 PM"},
            {"content": "Just finished reading Clean Code by Robert Martin. Highly recommend!", "likes": random.randint(10, 100), "time": "9:00 PM"},
        ],
        "dataset_source": "cresci_2017_synthetic",
    }

def load():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    print("Clearing existing profiles...")
    db.profiles.delete_many({})
    profiles = []
    print("Generating bot profiles...")
    for u in BOT_USERNAMES:
        profiles.append(generate_bot(u))
    for i in range(70):
        suffix = "".join(random.choices(string.digits, k=2))
        u = "bot_" + random.choice(["spam", "fake", "auto", "clone", "pump"]) + "_" + suffix
        profiles.append(generate_bot(u))
    print("Generating real profiles...")
    for u in REAL_USERNAMES:
        profiles.append(generate_real(u))
    for i in range(30):
        suffix = "".join(random.choices(string.ascii_lowercase, k=4))
        profiles.append(generate_real("user_" + suffix))
    print("Inserting " + str(len(profiles)) + " profiles...")
    db.profiles.insert_many(profiles)
    db.profiles.create_index("username")
    db.profiles.create_index("label")
    bots = db.profiles.count_documents({"label": "bot"})
    real = db.profiles.count_documents({"label": "real"})
    print("Done! Bots: " + str(bots) + " Real: " + str(real))
    client.close()

load()
