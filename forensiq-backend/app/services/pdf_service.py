"""
pdf_service.py — Generates publication-quality Forensic Intelligence Dossier PDFs
using ReportLab.

Contains:
- Profile overview and verification status
- Assessed Bot Risk score and classification badge
- Model ensemble breakdown with data availability status
- SHAP feature explainability table
- Rule-based detection flags
- Anthropic Claude AI Forensic Narrative
"""

import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)


def _get_status_color(status: str) -> colors.HexColor:
    s = (status or "").lower()
    if s == "fake":
        return colors.HexColor("#dc2626")  # Crimson red
    elif s == "suspicious":
        return colors.HexColor("#d97706")  # Amber
    else:
        return colors.HexColor("#059669")  # Emerald green


def generate_forensic_pdf(
    profile: dict,
    analysis_result: dict,
    narrative: str = None,
    report_id: str = None,
) -> bytes:
    """
    Generate a complete forensic dossier PDF in memory.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#4f46e5")  # Indigo 600
    muted_color = colors.HexColor("#64748b")   # Slate 500
    border_color = colors.HexColor("#cbd5e1")  # Slate 300
    bg_light = colors.HexColor("#f8fafc")      # Slate 50

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=muted_color,
    )
    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=primary_color,
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )
    narrative_style = ParagraphStyle(
        "NarrativeBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1e293b"),
    )
    narrative_h3 = ParagraphStyle(
        "NarrativeH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=accent_color,
        spaceBefore=6,
        spaceAfter=2,
    )

    story = []

    username = profile.get("username", "Unknown")
    name = profile.get("name") or username
    risk_score = analysis_result.get("risk_score", 0.0)
    status = analysis_result.get("status", "Unknown")
    status_color = _get_status_color(status)
    analyzed_at = profile.get("analyzed_at") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report_num = report_id or f"FIQ-{int(datetime.now().timestamp())}"
    eng_available = analysis_result.get("engagement_data_available", True)

    # 1. Header Banner
    header_data = [
        [
            Paragraph(f"<b>FORENSIQ INTELLIGENCE DOSSIER</b>", title_style),
            Paragraph(f"<b>REPORT ID:</b> {report_num}<br/><b>DATE:</b> {analyzed_at}", subtitle_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=8, spaceBefore=4))

    # 2. Target Profile & Verdict Summary Card
    verdict_text = f"""
    <b>Target Account:</b> @{username} ({name})<br/>
    <b>Platform:</b> {profile.get('platform', 'Twitter')} | <b>Verified:</b> {'YES' if profile.get('verified') else 'NO'}<br/>
    <b>Followers:</b> {profile.get('followers', 0):,} | <b>Following:</b> {profile.get('following', 0):,} | <b>Posts:</b> {profile.get('posts', 0):,}<br/>
    <b>Account Age:</b> {profile.get('account_age_days', 0):,} days | <b>Location:</b> {profile.get('location', 'Unknown')}
    """
    
    score_display = f"""
    <font size="8" color="#64748b">ASSESSED BOT RISK</font><br/>
    <font size="24" color="{status_color.hexval()}"><b>{risk_score}%</b></font><br/>
    <font size="9" color="{status_color.hexval()}"><b>CLASSIFICATION: {status.upper()}</b></font>
    """

    summary_data = [
        [
            Paragraph(verdict_text, body_style),
            Paragraph(score_display, ParagraphStyle("ScoreBox", parent=body_style, alignment=1)),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[360, 180])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_light),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8))

    # Data Availability Notice
    if not eng_available:
        notice_p = Paragraph(
            "<b>DATA COMPLETENESS NOTICE:</b> Recent tweet feed and interaction metrics could not be retrieved from the live platform. Content-derived signals were unassessed, and Random Forest was excluded from the ML blend to maintain statistical integrity.",
            ParagraphStyle("Notice", parent=body_style, fontSize=7.5, leading=10, textColor=colors.HexColor("#b45309"))
        )
        notice_table = Table([[notice_p]], colWidths=[540])
        notice_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#fcd34d")),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(notice_table)
        story.append(Spacer(1, 6))

    # 3. Model Scores Breakdown & Detection Flags (Two Columns)
    model_scores = analysis_result.get("model_scores") or {}
    model_rows = [
        [Paragraph("<b>Model / Signal</b>", body_bold), Paragraph("<b>Score</b>", body_bold), Paragraph("<b>Status</b>", body_bold)]
    ]
    
    # Heuristic
    rule_sc = model_scores.get("rule_based")
    model_rows.append([
        Paragraph("Rule-Based Heuristics", body_style),
        Paragraph(f"{rule_sc}%" if rule_sc is not None else "N/A", body_style),
        Paragraph("Active (100% data)", body_style)
    ])
    # RF
    rf_sc = model_scores.get("random_forest")
    if eng_available and rf_sc is not None:
        model_rows.append([Paragraph("Random Forest", body_style), Paragraph(f"{rf_sc}%", body_style), Paragraph("Active", body_style)])
    else:
        model_rows.append([Paragraph("Random Forest", body_style), Paragraph("N/A", body_style), Paragraph("Excluded (missing tweet data)", ParagraphStyle("Ex", parent=body_style, textColor=muted_color))])
    # XGB
    xgb_sc = model_scores.get("xgboost")
    model_rows.append([
        Paragraph("XGBoost (Native NaN)", body_style),
        Paragraph(f"{xgb_sc}%" if xgb_sc is not None else "N/A", body_style),
        Paragraph("Active", body_style)
    ])
    # LGB
    lgb_sc = model_scores.get("lightgbm")
    model_rows.append([
        Paragraph("LightGBM (Native NaN)", body_style),
        Paragraph(f"{lgb_sc}%" if lgb_sc is not None else "N/A", body_style),
        Paragraph("Active", body_style)
    ])

    model_table = Table(model_rows, colWidths=[120, 50, 100])
    model_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    # Detection Flags Box
    reasons = analysis_result.get("reasons") or []
    if reasons:
        flags_content = "<br/>".join([f"• {r}" for r in reasons[:5]])
    else:
        flags_content = "• No critical heuristic anomalies flagged."

    flags_p = Paragraph(f"<b>Key Detection Indicators:</b><br/>{flags_content}", body_style)
    flags_table = Table([[flags_p]], colWidths=[255])
    flags_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_light),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    two_col_table = Table([[model_table, flags_table]], colWidths=[275, 265])
    two_col_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(Paragraph("Ensemble Model Consensus & Heuristics", section_heading_style))
    story.append(two_col_table)
    story.append(Spacer(1, 6))

    # 4. SHAP Feature Contributions Table
    shap_exp = analysis_result.get("shap_explanation") or []
    if shap_exp:
        story.append(Paragraph("Top SHAP Feature Explainability (XAI)", section_heading_style))
        shap_rows = [
            [
                Paragraph("<b>Evaluated Feature</b>", body_bold),
                Paragraph("<b>SHAP Value</b>", body_bold),
                Paragraph("<b>Signal Direction</b>", body_bold),
                Paragraph("<b>Evaluated Feature</b>", body_bold),
                Paragraph("<b>SHAP Value</b>", body_bold),
                Paragraph("<b>Signal Direction</b>", body_bold),
            ]
        ]
        
        # Format top 6 features in 2 sub-columns
        top6 = shap_exp[:6]
        for i in range(0, len(top6), 2):
            item1 = top6[i]
            sig1_color = "#dc2626" if item1.get("signal") == "Bot Signal" else "#059669"
            col1_f = Paragraph(f"{item1.get('feature')}", body_style)
            col1_v = Paragraph(f"{item1.get('value'):+0.4f}", body_style)
            col1_s = Paragraph(f"<font color='{sig1_color}'><b>{item1.get('signal')}</b></font>", body_style)

            if i + 1 < len(top6):
                item2 = top6[i + 1]
                sig2_color = "#dc2626" if item2.get("signal") == "Bot Signal" else "#059669"
                col2_f = Paragraph(f"{item2.get('feature')}", body_style)
                col2_v = Paragraph(f"{item2.get('value'):+0.4f}", body_style)
                col2_s = Paragraph(f"<font color='{sig2_color}'><b>{item2.get('signal')}</b></font>", body_style)
            else:
                col2_f = Paragraph("", body_style)
                col2_v = Paragraph("", body_style)
                col2_s = Paragraph("", body_style)

            shap_rows.append([col1_f, col1_v, col1_s, col2_f, col2_v, col2_s])

        shap_table = Table(shap_rows, colWidths=[120, 50, 95, 120, 50, 95])
        shap_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('PADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(shap_table)
        story.append(Spacer(1, 6))

    # 5. AI Forensic Intelligence Narrative
    story.append(Paragraph("AI Forensic Intelligence Narrative", section_heading_style))
    if narrative:
        # Convert markdown headers into styled paragraphs
        lines = narrative.strip().split("\n")
        for line in lines:
            line_str = line.strip()
            if not line_str:
                story.append(Spacer(1, 3))
                continue
            if line_str.startswith("### "):
                header_text = line_str.replace("### ", "").replace("**", "")
                story.append(Paragraph(f"<b>{header_text}</b>", narrative_h3))
            elif line_str.startswith("## "):
                header_text = line_str.replace("## ", "").replace("**", "")
                story.append(Paragraph(f"<b>{header_text}</b>", narrative_h3))
            elif line_str.startswith("# "):
                header_text = line_str.replace("# ", "").replace("**", "")
                story.append(Paragraph(f"<b>{header_text}</b>", narrative_h3))
            elif line_str.startswith("- ") or line_str.startswith("* "):
                bullet_text = line_str[2:]
                story.append(Paragraph(f"• {bullet_text}", narrative_style))
            else:
                story.append(Paragraph(line_str, narrative_style))
    else:
        story.append(Paragraph("<i>Forensic narrative pending generation.</i>", narrative_style))

    doc.build(story)
    return buffer.getvalue()
