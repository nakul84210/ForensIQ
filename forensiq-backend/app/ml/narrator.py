"""
narrator.py — Generates natural-language digital forensic intelligence reports
using Groq Llama-3.3-70B (free tier) with fallback to Anthropic Claude or an
explicitly-labeled automated summary.

CRITICAL INTEGRITY CONSTRAINTS:
1. Strictly evidence-grounded: only references provided data (risk score, SHAP values,
   model scores, rule-based flags, engagement availability).
2. Explicit missing-data disclosure when engagement_data_available=False.
3. Honest ambiguity reflection for "Suspicious" status profiles.
4. If AI narration engine is unavailable, returns a clearly-labeled automated summary
   with an explicit disclaimer banner — never silently disguised as AI output.
"""

import os
import logging
import json
from dotenv import load_dotenv
from groq import Groq, APIError as GroqAPIError
from app.config import settings

logger = logging.getLogger("forensiq.narrator")

SYSTEM_PROMPT = """You are the Lead Forensic Intelligence Analyst at ForensIQ, an advanced social media inauthentic behavior and digital misinformation analysis platform.
Your task is to write a rigorous, evidence-based digital forensic intelligence report evaluating the authenticity of a target profile based STRICTLY on the provided data payload.

CRITICAL CONSTRAINTS:
1. STRICT TRUTHFULNESS & GROUNDING: Only reference the actual profile metadata, calculated risk score, status classification, rule-based detection flags, SHAP feature contributions, and ML ensemble scores provided in the input. NEVER invent, extrapolate, or hallucinate metrics, dates, tweets, follower counts, or external facts not present in the payload.
2. MISSING ENGAGEMENT DATA HANDLING: When engagement_data_available is False, you MUST explicitly state that engagement-related metrics (e.g., tweet content, likes per post, hashtag repetition, URL density, tweet template consistency, posting hour entropy, language switches) could not be retrieved from the live platform. Explain that content-based signals were therefore not assessed and the classification relies solely on profile-level metadata and username heuristics. Do NOT treat missing engagement metrics as clean or organic human behavior.
3. HONEST REFLECTION OF AMBIGUITY: When the classification status is "Suspicious" (or when the risk score falls in the ambiguous mid-range), you MUST reflect the genuine uncertainty honestly. Explain that the account exhibits sparse or mixed signals (e.g., low activity, recent creation, sparse bio/location) that legitimately overlap with both normal low-activity human users and emerging synthetic/bot accounts. Do NOT force false confidence in either direction.
4. ENSEMBLE MODEL EXCLUSIONS: When engagement_data_available is False, the Random Forest model is intentionally excluded from the scoring blend because it cannot natively process missing dimensions without imputation (whereas XGBoost and LightGBM handle missing values natively). If Random Forest is absent or marked excluded, do not describe it as an error or system defect; evaluate the active models and heuristic blend.
5. PROFESSIONAL STRUCTURE: Format your response clearly in professional Markdown using the following 3 structured sections:
   ### Executive Verdict & Risk Assessment
   - State the overall risk score (0–99%), classification (Real, Suspicious, or Fake), and confidence level based on data completeness.
   ### Forensic Indicators & SHAP Feature Analysis
   - Analyze the top SHAP feature contributions (signals pushing toward Bot vs. Real), key rule-based detection flags, and model score consensus.
   ### Investigative Context & Recommendations
   - Detail whether additional data (such as historical posting archives or follower interaction graphs) is required, summarize threat vectors if any, and provide actionable operational recommendations.
"""


def _generate_labeled_fallback(profile: dict, classify_result: dict, reason: str) -> str:
    """
    Generate a deterministic, strictly evidence-grounded forensic summary
    with an EXPLICIT disclaimer banner when AI API is unavailable.
    """
    uname = profile.get("username", "unknown")
    risk_score = classify_result.get("risk_score", 0.0)
    status = classify_result.get("status", "Unknown")
    eng_available = classify_result.get("engagement_data_available", True)
    model_scores = classify_result.get("model_scores") or {}
    shap_exp = classify_result.get("shap_explanation") or []
    reasons = classify_result.get("reasons") or []

    banner = f"> ⚠️ **Automated Forensic Summary — AI Narration Engine Unavailable ({reason})**\n\n"

    # Section 1: Executive Verdict
    sec1 = f"### Executive Verdict & Risk Assessment\n"
    if status == "Fake":
        sec1 += f"The target account @{uname} has been classified as **Fake** with an assessed bot risk score of **{risk_score}%**. The profile displays strong statistical alignment with automated or inauthentic account archetypes.\n"
    elif status == "Suspicious":
        sec1 += f"The target account @{uname} has been classified as **Suspicious** with an assessed bot risk score of **{risk_score}%**. The account displays sparse or conflicting indicators that warrant elevated scrutiny without a definitive automated confirmation.\n"
    else:
        sec1 += f"The target account @{uname} has been classified as **Real** with a low assessed bot risk score of **{risk_score}%**. Profile indicators align closely with authentic human usage patterns.\n"

    if not eng_available:
        sec1 += "\n- **Data Completeness Notice:** Live tweet feeds and interaction metrics were unavailable during analysis. Content-derived features were unassessed, and scoring is based on profile-level metadata and username heuristics.\n"

    # Section 2: Forensic Indicators
    sec2 = "### Forensic Indicators & SHAP Feature Analysis\n"
    # Model scores
    active_models = []
    for m, sc in model_scores.items():
        if sc is not None:
            active_models.append(f"{m.replace('_', ' ').title()} ({sc}%)")
    if active_models:
        sec2 += f"- **Model Consensus:** Active detection signals evaluated include {', '.join(active_models)}."
        if not eng_available:
            sec2 += " (Random Forest was intentionally excluded due to missing engagement metrics)."
        sec2 += "\n"

    # Reasons
    if reasons:
        sec2 += "- **Triggered Rule Flags:**\n"
        for r in reasons[:4]:
            sec2 += f"  - {r}\n"

    # SHAP
    if shap_exp:
        sec2 += "- **Top SHAP Explainability Contributions:**\n"
        for s in shap_exp[:4]:
            val_str = f"{s.get('value'):+0.4f}" if isinstance(s.get('value'), (int, float)) else str(s.get('value'))
            sec2 += f"  - **{s.get('feature')}:** {val_str} ({s.get('signal')})\n"

    # Section 3: Recommendations
    sec3 = "### Investigative Context & Recommendations\n"
    if status == "Fake":
        sec3 += "- **Operational Recommendation:** Quarantine account from verified data feeds and monitor connected cluster nodes for amplification patterns.\n"
    elif status == "Suspicious":
        sec3 += "- **Operational Recommendation:** Maintain passive observation. Gather additional post streams once available before taking administrative actions.\n"
    else:
        sec3 += "- **Operational Recommendation:** Standard human account profile. No investigative restrictions recommended at this time.\n"

    return (banner + sec1 + "\n" + sec2 + "\n" + sec3).strip()


def generate_narrative(profile: dict, classify_result: dict) -> str:
    """
    Generate an evidence-grounded forensic narrative using Groq Llama 3.3 70B
    (or Anthropic if available), with a clearly labeled fallback if API is unavailable.
    """
    load_dotenv(override=True)
    groq_api_key = (os.getenv("GROQ_API_KEY") or getattr(settings, "GROQ_API_KEY", "") or "").strip()
    anthropic_api_key = (os.getenv("ANTHROPIC_API_KEY") or getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()

    engagement_available = classify_result.get("engagement_data_available", True)
    model_scores = classify_result.get("model_scores") or {}
    shap_explanation = classify_result.get("shap_explanation") or []
    reasons = classify_result.get("reasons") or []

    raw_features = classify_result.get("features") or {}
    clean_features = {}
    for k, v in raw_features.items():
        if k.startswith("_"):
            continue
        if v is None or (isinstance(v, float) and (v != v)):
            clean_features[k] = "NOT_AVAILABLE"
        else:
            clean_features[k] = v

    analysis_payload = {
        "target_profile": {
            "username": profile.get("username", "unknown"),
            "name": profile.get("name", ""),
            "platform": profile.get("platform", "Twitter"),
            "followers": profile.get("followers", 0),
            "following": profile.get("following", 0),
            "posts_count": profile.get("posts", 0),
            "bio": profile.get("bio", ""),
            "location": profile.get("location", "Unknown"),
            "account_age_days": profile.get("account_age_days", 0),
            "verified": bool(profile.get("verified", False)),
        },
        "classification_results": {
            "risk_score": classify_result.get("risk_score", 0.0),
            "status": classify_result.get("status", "Unknown"),
            "engagement_data_available": engagement_available,
            "rule_based_detection_flags": reasons,
            "ml_model_scores": model_scores,
            "top_shap_feature_contributions": shap_explanation,
            "extracted_feature_vector": clean_features,
        },
        "data_availability_notes": (
            "Full engagement data available including tweet text and interaction metrics."
            if engagement_available
            else "LIMITED DATA: Recent tweet stream and engagement metrics could not be retrieved from live platform. Random Forest model excluded from blend; scoring based on profile metadata and XGBoost/LightGBM missing-value splits."
        )
    }

    user_prompt = f"""Generate a comprehensive Forensic Intelligence Narrative for the following analyzed profile:

```json
{json.dumps(analysis_payload, indent=2)}
```

Ensure all findings strictly adhere to the provided data and instructions."""

    # Option A: Try Groq API (Free tier)
    if groq_api_key:
        try:
            client = Groq(api_key=groq_api_key)
            preferred = (getattr(settings, "GROQ_MODEL", "") or "qwen/qwen3.8-27b").strip()
            candidate_models = [preferred, "qwen/qwen3.8-27b", "groq/compound", "openai/gpt-oss-120b"]
            
            # Deduplicate preserving order
            seen_models = set()
            models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]
            
            last_err = None
            for model_name in models_to_try:
                try:
                    completion = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        max_tokens=1500,
                        temperature=0.2
                    )
                    narrative_text = completion.choices[0].message.content or ""
                    if narrative_text.strip():
                        return narrative_text.strip()
                except Exception as me:
                    last_err = me
                    continue

            if last_err:
                raise last_err
        except GroqAPIError as ge:
            logger.warning(f"[narrator] Groq API error: {ge}")
            return _generate_labeled_fallback(profile, classify_result, f"Groq API Error: {ge.message or str(ge)}")
        except Exception as e:
            logger.warning(f"[narrator] Groq call failed: {e}")
            return _generate_labeled_fallback(profile, classify_result, f"Groq service error: {str(e)}")

    # Option B: Try Anthropic Claude if configured and has credits
    if anthropic_api_key:
        try:
            from anthropic import Anthropic
            workspace_id = (os.getenv("ANTHROPIC_WORKSPACE_ID") or getattr(settings, "ANTHROPIC_WORKSPACE_ID", "") or "").strip()
            client_kwargs = {"api_key": anthropic_api_key}
            if workspace_id:
                client_kwargs["default_headers"] = {"anthropic-workspace-id": workspace_id}

            anthropic_client = Anthropic(**client_kwargs)
            message = anthropic_client.messages.create(
                model=settings.ANTHROPIC_MODEL or "claude-3-7-sonnet-20250219",
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}]
            )
            narrative_text = ""
            for block in message.content:
                if hasattr(block, "text"):
                    narrative_text += block.text
            if narrative_text.strip():
                return narrative_text.strip()
        except Exception as ae:
            logger.warning(f"[narrator] Anthropic call failed: {ae}")
            err_detail = getattr(ae, "message", None) or str(ae)
            if "credit balance" in err_detail.lower():
                err_detail = "Anthropic credit balance is $0"
            return _generate_labeled_fallback(profile, classify_result, err_detail)

    # Option C: If no API key configured, return clearly labeled fallback
    return _generate_labeled_fallback(profile, classify_result, "No GROQ_API_KEY configured in .env")
