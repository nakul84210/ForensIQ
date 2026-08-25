import numpy as np
from PIL import Image
import io
import hashlib

def get_image_features(image_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    arr = np.array(img, dtype=np.float32)

    # Feature 1 — ELA at multiple qualities
    ela_scores = []
    for q in [50, 70, 90]:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=q)
        buf.seek(0)
        comp = np.array(Image.open(buf).convert("RGB"), dtype=np.float32)
        ela_scores.append(float(np.mean(np.abs(arr - comp))))

    # Feature 2 — Noise analysis
    gray = np.array(img.convert("L"), dtype=np.float32)
    noise_std = float(np.std(gray - np.mean(gray)))

    # Feature 3 — Color statistics
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    r_std = float(np.std(r))
    g_std = float(np.std(g))
    b_std = float(np.std(b))
    rg_corr = float(np.corrcoef(r.flatten(), g.flatten())[0,1])

    # Feature 4 — High frequency content
    from numpy.fft import fft2
    fft = np.abs(fft2(gray))
    hf_ratio = float(np.sum(fft[h//4:, :]) / (np.sum(fft) + 1e-5))

    # Feature 5 — Local variance
    patches = []
    step = min(w, h) // 8
    for i in range(0, min(h-step, h), step):
        for j in range(0, min(w-step, w), step):
            patch = gray[i:i+step, j:j+step]
            patches.append(float(np.var(patch)))
    patch_var_std = float(np.std(patches)) if patches else 0

    # Feature 6 — EXIF (informational only — NOT used for scoring)
    # NOTE: Social media platforms (Twitter, Instagram, Facebook, etc.) universally
    # strip EXIF metadata on upload for ALL images, real or AI-generated. Therefore,
    # EXIF absence is NOT informative for deepfake detection in this use case.
    # EXIF data is extracted purely for display in the analysis report.
    has_exif = False
    camera = ""
    try:
        exif = img._getexif()
        if exif and len(exif) > 0:
            has_exif = True
            camera = str(exif.get(271,"")) + " " + str(exif.get(272,""))
    except:
        pass

    # Feature 7 — Dimension check
    common_ai = [(512,512),(1024,1024),(256,256),(768,768),(512,768),(768,512),(1024,768),(768,1024),(416,416)]
    is_ai_size = (w,h) in common_ai

    return {
        "ela_q50": ela_scores[0],
        "ela_q70": ela_scores[1],
        "ela_q90": ela_scores[2],
        "ela_range": ela_scores[0] - ela_scores[2],
        "noise_std": noise_std,
        "r_std": r_std, "g_std": g_std, "b_std": b_std,
        "rg_corr": rg_corr,
        "hf_ratio": hf_ratio,
        "patch_var_std": patch_var_std,
        "has_exif": has_exif,
        "camera": camera.strip(),
        "is_ai_size": is_ai_size,
        "width": w, "height": h,
    }

def score_features(f: dict, filename: str = "") -> tuple:
    """
    Score image features for deepfake/AI-generation likelihood.

    Scoring signals (EXIF is NOT scored — see note in get_image_features):
      - ELA uniformity: high weight (AI images have very uniform compression)
      - Noise variance: medium-high weight (synthetic images lack sensor noise)
      - High-frequency content: medium-high weight (AI images often lack fine detail)
      - Color distribution: low-medium weight (supplementary signal)
      - Texture variance: low-medium weight (supplementary signal)
      - AI dimensions: medium weight (common AI canvas sizes)
      - Filename keywords: high weight (explicit generator tool names)
    """
    score = 0
    reasons = []

    fn_lower = filename.lower()
    is_explicit_ai_filename = any(kw in fn_lower for kw in ["chatgpt", "dall", "dalle", "midjourney", "stablediffusion", "sdxl", "flux", "bing", "ai_generated", "generated"])
    if is_explicit_ai_filename:
        score += 65
        reasons.append("Filename metadata matches AI generator tool pattern (" + filename + ")")

    # 1. ELA range check — uniform ELA is suspicious regardless of EXIF
    # (EXIF is not considered because social media strips it universally)
    ela_range = f["ela_range"]
    if ela_range < 1.2:
        score += 25
        reasons.append("Uniform ELA compression profile (consistent with AI generation)")
    elif ela_range < 2.5:
        score += 8
        reasons.append("Moderately uniform ELA compression")

    # 2. Noise std check — synthetic images typically have very low noise variance
    ns = f["noise_std"]
    if ns < 20:
        score += 20
        reasons.append("Low sensor noise variance (consistent with synthetic generation)")

    # 3. High frequency content check
    if f["hf_ratio"] < 0.03:
        score += 18
        reasons.append("Low high-frequency detail density")

    # 4. Color distribution — supplementary signal
    avg_channel_std = (f["r_std"] + f["g_std"] + f["b_std"]) / 3
    if avg_channel_std < 20:
        score += 10
        reasons.append("Low color channel variance (overly uniform color distribution)")

    # 5. Local texture variance — supplementary signal
    if f["patch_var_std"] < 30:
        score += 8
        reasons.append("Uniform local texture (lacks natural texture variation)")

    # 6. AI dimensions check
    if f["is_ai_size"]:
        score += 15
        reasons.append("Image dimensions match standard AI generation canvas sizes")

    # NOTE: EXIF metadata is NOT scored. Social media platforms (Twitter, Instagram,
    # Facebook, etc.) strip EXIF on upload for ALL images — real and AI-generated alike.
    # Its absence is therefore not informative for this use case and would cause
    # false positives on virtually every social media image.

    # Final score calibration
    final_score = min(max(score, 0), 99)

    return final_score, reasons

def detect_deepfake(image_bytes: bytes, filename: str = "") -> dict:
    f = get_image_features(image_bytes)
    score, reasons = score_features(f, filename=filename)

    verdict = "AI Generated" if score >= 55 else "Likely Real"

    checks = [
        {
            "label": "Error Level Analysis",
            "result": "Suspicious" if f["ela_range"] < 1.2 else "Normal",
            "risk": "high" if f["ela_range"] < 1.2 else "low",
            "detail": "ELA range across qualities: " + str(round(f["ela_range"],2)) + " (low = uniform compression)"
        },
        {
            "label": "Noise Pattern Analysis",
            "result": "Synthetic" if f["noise_std"] < 20 else "Natural",
            "risk": "high" if f["noise_std"] < 20 else "low",
            "detail": "Noise std: " + str(round(f["noise_std"],2)) + " (natural sensor range)"
        },
        {
            "label": "Color Distribution",
            "result": "Suspicious" if (f["r_std"]+f["g_std"]+f["b_std"])/3 < 20 else "Normal",
            "risk": "high" if (f["r_std"]+f["g_std"]+f["b_std"])/3 < 20 else "low",
            "detail": "Avg channel std: " + str(round((f["r_std"]+f["g_std"]+f["b_std"])/3,2))
        },
        {
            "label": "High Frequency Content",
            "result": "Low" if f["hf_ratio"] < 0.03 else "Normal",
            "risk": "medium" if f["hf_ratio"] < 0.03 else "low",
            "detail": "HF ratio: " + str(round(f["hf_ratio"],4))
        },
        {
            "label": "Local Texture Variance",
            "result": "Uniform" if f["patch_var_std"] < 30 else "Natural",
            "risk": "medium" if f["patch_var_std"] < 30 else "low",
            "detail": "Patch variance std: " + str(round(f["patch_var_std"],2))
        },
        {
            # EXIF is informational only — explicitly labeled as such
            "label": "EXIF Metadata (Informational)",
            "result": "Present — " + f["camera"] if f["has_exif"] else "Not present (normal for social media images)",
            "risk": "info",
            "detail": ("Camera: " + f["camera"] if f["has_exif"]
                       else "Social media platforms strip EXIF on upload — absence is not indicative of AI generation")
        },
        {
            "label": "Image Dimensions",
            "result": "AI Size" if f["is_ai_size"] else "Natural — " + str(f["width"]) + "x" + str(f["height"]),
            "risk": "medium" if f["is_ai_size"] else "low",
            "detail": str(f["width"]) + "x" + str(f["height"]) + (" matches common AI output size" if f["is_ai_size"] else " — natural dimensions")
        },
    ]

    # No real model-fingerprinting is implemented. Specific generator identification
    # (e.g. "StyleGAN" vs "Midjourney" vs "DALL-E") requires dedicated classifier
    # models trained on generator-specific artifacts. We do not present low-confidence
    # heuristics as if they identified a specific generator.
    generation_style_guess = "unknown"

    return {
        "verdict": verdict,
        "confidence": score,
        "checks": checks,
        "ela": "Suspicious" if f["ela_range"] < 1.2 else "Normal",
        "metadata": f["camera"] if f["has_exif"] else "None found",
        "generation_style_guess": generation_style_guess,
        # Keep "model" key for backward compatibility but set honestly
        "model": generation_style_guess,
    }
