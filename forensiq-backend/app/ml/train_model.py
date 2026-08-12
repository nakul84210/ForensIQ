"""
train_model.py — Train ensemble bot detection models on 28 feature schema.

Supports two data sources:
  1. Cresci-2017 benchmark dataset (default / recommended):
     python -m app.ml.train_model --source cresci

  2. Custom labeled_profiles.csv:
     python -m app.ml.train_model --source labeled

Ensemble models trained & saved:
  - RandomForestClassifier (random_forest_model.pkl)
  - XGBClassifier / GradientBoosting (xgboost_model.pkl)
  - LGBMClassifier (lgbm_model.pkl)
  - Feature order (features.pkl)
  - Detailed evaluation metrics (metrics.json)
"""

import os
import sys
import argparse
import json
import csv
import time
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report, precision_score, recall_score, f1_score

try:
    from lightgbm import LGBMClassifier
    _LGBM_AVAILABLE = True
except ImportError:
    _LGBM_AVAILABLE = False

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from app.services.twitter_service import fetch_twitter_profile
from app.ml.fake_detector import FEATURE_ORDER, extract_features

_ML_DIR = os.path.dirname(__file__)
LABELED_CSV = os.path.join(_ML_DIR, "labeled_profiles.csv")
CACHE_JSON  = os.path.join(_ML_DIR, "raw_profile_cache.json")


def _load_cache() -> dict:
    if os.path.exists(CACHE_JSON):
        with open(CACHE_JSON) as f:
            return json.load(f)
    return {}


def _save_cache(cache: dict) -> None:
    with open(CACHE_JSON, "w") as f:
        json.dump(cache, f, indent=2)


def fetch_labeled_dataset(rate_limit_seconds: float = 1.0) -> pd.DataFrame:
    """Read labeled_profiles.csv, fetch live data for each user, and extract 28 features."""
    if not os.path.exists(LABELED_CSV):
        raise FileNotFoundError(f"{LABELED_CSV} not found.")

    with open(LABELED_CSV) as f:
        raw_rows = list(csv.DictReader(f))

    rows = [
        r for r in raw_rows
        if r.get("username") and not r["username"].strip().startswith("#")
        and r.get("label") is not None
    ]

    if not rows:
        raise RuntimeError("labeled_profiles.csv contains no usable data rows.")

    cache = _load_cache()
    records = []
    skipped = []

    for i, row in enumerate(rows):
        username  = row["username"].strip().lstrip("@")
        label_str = (row.get("label") or "").strip().lower()
        if label_str not in ("bot", "real"):
            continue

        if username in cache:
            profile = cache[username]
            print(f"[{i+1}/{len(rows)}] {username} (cached)")
        else:
            print(f"[{i+1}/{len(rows)}] fetching {username} from Twitter...")
            profile = fetch_twitter_profile(username)
            cache[username] = profile
            _save_cache(cache)
            time.sleep(rate_limit_seconds)

        if not profile.get("found"):
            skipped.append(username)
            continue

        feat = extract_features(profile)
        feat["label"] = 1 if label_str == "bot" else 0
        feat["username"] = username
        records.append(feat)

    if skipped:
        print(f"\n{len(skipped)} accounts skipped: {skipped}")

    df = pd.DataFrame(records)
    if df.empty:
        raise RuntimeError("No profiles successfully fetched.")
    return df


def train(df: pd.DataFrame, source_name: str = "cresci_2017"):
    """Fit RandomForest, XGBoost, and LightGBM models on feature DataFrame."""
    X = df[FEATURE_ORDER].fillna(0)
    y = df["label"]

    n_bot  = int((y == 1).sum())
    n_real = int((y == 0).sum())
    print(f"\n=======================================================")
    print(f" TRAINING BOT DETECTION ENSEMBLE ({source_name})")
    print(f" Dataset size: {len(df)} profiles ({n_bot} bot, {n_real} real)")
    print(f" Feature schema: {len(FEATURE_ORDER)} features")
    print(f"=======================================================\n")

    if y.nunique() < 2:
        raise RuntimeError(f"Training requires both 'bot' AND 'real' examples. Got: {n_bot} bot, {n_real} real.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    models = {
        "random_forest": RandomForestClassifier(
            n_estimators=250, max_depth=10, min_samples_leaf=2, random_state=42
        ),
        "xgboost": GradientBoostingClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42
        ),
    }

    if _LGBM_AVAILABLE:
        models["lightgbm"] = LGBMClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.05, random_state=42, verbose=-1
        )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    metrics = {}

    for name, model in models.items():
        print(f"--- Training {name.upper()} ---")
        model.fit(X_train, y_train)

        preds = model.predict(X_test)
        probs = model.predict_proba(X_test)[:, 1]

        cv_scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy")

        test_acc = accuracy_score(y_test, preds)
        test_prec = precision_score(y_test, preds, zero_division=0)
        test_rec  = recall_score(y_test, preds, zero_division=0)
        test_f1   = f1_score(y_test, preds, zero_division=0)
        try:
            test_auc = roc_auc_score(y_test, probs)
        except ValueError:
            test_auc = 0.0

        print(f"  Test Accuracy:  {test_acc:.4f}")
        print(f"  Test Precision: {test_prec:.4f}")
        print(f"  Test Recall:    {test_rec:.4f}")
        print(f"  Test F1 Score:  {test_f1:.4f}")
        print(f"  Test ROC-AUC:   {test_auc:.4f}")
        print(f"  5-Fold CV Acc:  {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})\n")

        metrics[name] = {
            "test_accuracy":   round(test_acc, 4),
            "test_precision":  round(test_prec, 4),
            "test_recall":     round(test_rec, 4),
            "test_f1":         round(test_f1, 4),
            "test_auc":        round(test_auc, 4),
            "cv_accuracy_mean": round(cv_scores.mean(), 4),
            "cv_accuracy_std":  round(cv_scores.std(), 4),
            "n_train": len(X_train),
            "n_test":  len(X_test),
        }

    # Save model artifacts
    joblib.dump(models["random_forest"], os.path.join(_ML_DIR, "random_forest_model.pkl"))
    joblib.dump(models["xgboost"],       os.path.join(_ML_DIR, "xgboost_model.pkl"))
    if "lightgbm" in models:
        joblib.dump(models["lightgbm"],  os.path.join(_ML_DIR, "lgbm_model.pkl"))
    joblib.dump(FEATURE_ORDER,           os.path.join(_ML_DIR, "features.pkl"))

    metrics["trained_on"] = source_name
    metrics["n_total_profiles"] = len(df)
    metrics["feature_count"] = len(FEATURE_ORDER)
    metrics["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")

    with open(os.path.join(_ML_DIR, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"✅ Successfully saved models and metrics.json to {_ML_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Bot Detection ML Ensemble")
    parser.add_argument(
        "--source",
        choices=["cresci", "labeled"],
        default="cresci",
        help="Dataset source: 'cresci' (Cresci-2017 benchmark) or 'labeled' (labeled_profiles.csv)"
    )
    args = parser.parse_args()

    if args.source == "cresci":
        from app.ml.cresci_loader import load_cresci_dataset
        df = load_cresci_dataset()
        train(df, source_name="cresci_2017_benchmark")
    else:
        df = fetch_labeled_dataset()
        train(df, source_name="labeled_profiles_csv")
