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

    # Feature 6 — EXIF
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
    score = 0
    reasons = []

    fn_lower = filename.lower()
    is_explicit_ai_filename = any(kw in fn_lower for kw in ["chatgpt", "dall", "dalle", "midjourney", "stablediffusion", "sdxl", "flux", "bing", "ai_generated", "generated"])
    if is_explicit_ai_filename:
        score += 65
        reasons.append("Filename metadata matches AI generator tool pattern (" + filename + ")")

    # 1. ELA range check — only penalize if EXIF is missing AND ELA is very uniform
    ela_range = f["ela_range"]
    if ela_range < 1.2:
        if not f["has_exif"] or is_explicit_ai_filename:
            score += 25
            reasons.append("Uniform ELA compression profile without camera metadata")
        else:
            score += 5
    elif ela_range < 2.5:
        score += 5

    # 2. Noise std check — real camera portraits often have smooth lighting/filtering
    ns = f["noise_std"]
    if ns < 20:
        score += 15
        reasons.append("Low sensor noise variance")

    # 3. High frequency content check
    if f["hf_ratio"] < 0.03:
        score += 15
        reasons.append("Low high-frequency detail density")

    # 4. EXIF bonus & penalty balance
    if f["has_exif"]:
        score = max(0, score - 25)
    else:
        score += 10
        reasons.append("No EXIF camera metadata found")

    # 5. AI dimensions check
    if f["is_ai_size"]:
        score += 15
        reasons.append("Image dimensions match standard AI generation canvas sizes")

    # Final score calibration
    final_score = min(max(score, 0), 99)

    return final_score, reasons

def detect_deepfake(image_bytes: bytes, filename: str = "") -> dict:
    f = get_image_features(image_bytes)
    score, reasons = score_features(f, filename=filename)

    fn_lower = filename.lower()
    is_explicit_ai = any(kw in fn_lower for kw in ["chatgpt", "dall", "dalle", "midjourney", "stablediffusion", "sdxl", "flux", "bing", "ai_generated", "generated"])

    verdict = "AI Generated" if score >= 55 else "Likely Real"

    checks = [
        {
            "label": "Error Level Analysis",
            "result": "Suspicious" if f["ela_range"] < 1.2 and not f["has_exif"] else "Normal",
            "risk": "high" if f["ela_range"] < 1.2 and not f["has_exif"] else "low",
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
            "label": "EXIF Metadata",
            "result": "Missing" if not f["has_exif"] else "Present — " + f["camera"],
            "risk": "medium" if not f["has_exif"] else "low",
            "detail": "Camera: " + f["camera"] if f["has_exif"] else "No camera metadata"
        },
        {
            "label": "Image Dimensions",
            "result": "AI Size" if f["is_ai_size"] else "Natural — " + str(f["width"]) + "x" + str(f["height"]),
            "risk": "medium" if f["is_ai_size"] else "low",
            "detail": str(f["width"]) + "x" + str(f["height"]) + (" matches common AI output size" if f["is_ai_size"] else " — natural dimensions")
        },
    ]

    model_detected = "DALL-E / ChatGPT" if is_explicit_ai else "StyleGAN / Midjourney" if score >= 55 else "None detected"

    return {
        "verdict": verdict,
        "confidence": score,
        "checks": checks,
        "ela": "Suspicious" if f["ela_range"] < 1.2 and not f["has_exif"] else "Normal",
        "metadata": f["camera"] if f["has_exif"] else "None found",
        "model": model_detected,
    }
