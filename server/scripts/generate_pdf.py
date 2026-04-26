#!/usr/bin/env python3
"""
AppraiseAI — Certified Appraisal Report Generator
Uses ReportLab Platypus to generate professional, USPAP-style PDF reports.

Usage: python3 generate_pdf.py <input_json_path> <output_pdf_path>
"""

import sys
import json
import os
import tempfile
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


PHOTO_CATEGORY_LABELS = {
    "exterior": "Exterior",
    "interior": "Interior",
    "roof": "Roof",
    "foundation": "Foundation",
    "other": "Other",
}


def _download_photo(url, dest_dir):
    """Download a photo URL to a temp file; return path or None on failure."""
    try:
        req = Request(url, headers={"User-Agent": "AppraiseAI-PDF/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = resp.read()
        if not data:
            return None
        # pick a sane extension from URL; default to .jpg
        ext = ".jpg"
        lower = url.lower().split("?")[0]
        for candidate in (".jpg", ".jpeg", ".png", ".webp"):
            if lower.endswith(candidate):
                ext = candidate
                break
        fd, path = tempfile.mkstemp(prefix="appraise-photo-", suffix=ext, dir=dest_dir)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return path
    except (URLError, HTTPError, OSError, ValueError) as exc:
        sys.stderr.write(f"[PDF] Failed to fetch photo {url}: {exc}\n")
        return None

# ── Brand Colors ────────────────────────────────────────────────────────────
NAVY    = colors.HexColor("#0F1F3D")
GOLD    = colors.HexColor("#C9A84C")
CREAM   = colors.HexColor("#FAF7F2")
LIGHT   = colors.HexColor("#F0EDE8")
MUTED   = colors.HexColor("#666666")
RED     = colors.HexColor("#C0392B")
GREEN   = colors.HexColor("#27AE60")
WHITE   = colors.white
BLACK   = colors.black

def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["cover_title"] = ParagraphStyle(
        "cover_title", fontName="Helvetica-Bold", fontSize=28,
        textColor=NAVY, alignment=TA_CENTER, spaceAfter=6
    )
    styles["cover_sub"] = ParagraphStyle(
        "cover_sub", fontName="Helvetica", fontSize=13,
        textColor=GOLD, alignment=TA_CENTER, spaceAfter=4
    )
    styles["cover_meta"] = ParagraphStyle(
        "cover_meta", fontName="Helvetica", fontSize=10,
        textColor=MUTED, alignment=TA_CENTER, spaceAfter=4
    )
    styles["section_header"] = ParagraphStyle(
        "section_header", fontName="Helvetica-Bold", fontSize=11,
        textColor=WHITE, alignment=TA_LEFT, spaceAfter=0,
        leftIndent=8, leading=16
    )
    styles["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9.5,
        textColor=BLACK, alignment=TA_JUSTIFY, spaceAfter=6,
        leading=14
    )
    styles["label"] = ParagraphStyle(
        "label", fontName="Helvetica-Bold", fontSize=8.5,
        textColor=NAVY, spaceAfter=2
    )
    styles["value"] = ParagraphStyle(
        "value", fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#333333"), spaceAfter=4
    )
    styles["big_number"] = ParagraphStyle(
        "big_number", fontName="Helvetica-Bold", fontSize=22,
        textColor=GOLD, alignment=TA_CENTER, spaceAfter=2
    )
    styles["big_label"] = ParagraphStyle(
        "big_label", fontName="Helvetica", fontSize=8,
        textColor=MUTED, alignment=TA_CENTER, spaceAfter=0
    )
    styles["disclaimer"] = ParagraphStyle(
        "disclaimer", fontName="Helvetica-Oblique", fontSize=7.5,
        textColor=MUTED, alignment=TA_JUSTIFY, leading=11
    )
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=8,
        textColor=MUTED, alignment=TA_CENTER
    )
    styles["bullet"] = ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=9,
        textColor=BLACK, leftIndent=14, spaceAfter=4,
        bulletIndent=4, leading=13
    )
    styles["score_label"] = ParagraphStyle(
        "score_label", fontName="Helvetica-Bold", fontSize=10,
        textColor=NAVY, alignment=TA_CENTER
    )
    return styles


def section_header(text, styles):
    """Returns a navy background section header row."""
    header_data = [[Paragraph(text.upper(), styles["section_header"])]]
    t = Table(header_data, colWidths=[7.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def fmt_currency(val):
    if val is None:
        return "N/A"
    try:
        return f"${int(val):,}"
    except Exception:
        return str(val)


def fmt_pct(val):
    if val is None:
        return "N/A"
    try:
        return f"{float(val):.1f}%"
    except Exception:
        return str(val)


def score_color(score):
    if score >= 70:
        return GREEN
    elif score >= 40:
        return GOLD
    else:
        return RED


def generate_pdf(data: dict, output_path: str):
    styles = build_styles()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="AppraiseAI Certified Appraisal Report",
        author="AppraiseAI",
        subject=f"Property Appraisal — {data.get('address', '')}",
    )

    story = []
    W = 7.5 * inch  # usable width

    # ── COVER PAGE ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.6 * inch))

    # Logo / Brand
    story.append(Paragraph("AppraiseAI", styles["cover_title"]))
    story.append(Paragraph("Certified Property Appraisal Report", styles["cover_sub"]))
    story.append(HRFlowable(width=W, thickness=2, color=GOLD, spaceAfter=16))

    # Property address block
    addr_lines = [
        data.get("address", ""),
        f"{data.get('city', '')}, {data.get('state', '')} {data.get('zipCode', '')}".strip(", "),
    ]
    if data.get("county"):
        addr_lines.append(f"{data['county']} County")
    for line in addr_lines:
        if line.strip():
            story.append(Paragraph(line, styles["cover_meta"]))

    story.append(Spacer(1, 0.3 * inch))

    # Report metadata table
    meta_rows = [
        ["Report Date:", data.get("reportDate", datetime.today().strftime("%B %d, %Y"))],
        ["Property Type:", data.get("propertyType", "Residential").title()],
        ["Report Type:", data.get("reportType", "Instant AI Appraisal").title()],
    ]
    if data.get("parcelNumber"):
        meta_rows.append(["Parcel Number:", data["parcelNumber"]])
    if data.get("ownerName"):
        meta_rows.append(["Prepared For:", data["ownerName"]])

    meta_table = Table(
        [[Paragraph(r[0], styles["label"]), Paragraph(r[1], styles["value"])] for r in meta_rows],
        colWidths=[2 * inch, 5.5 * inch],
        hAlign="CENTER",
    )
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0DDD5")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.4 * inch))

    # Appeal strength score badge
    score = data.get("appealStrengthScore", 0)
    sc = score_color(score)
    score_data = [[
        Paragraph(f"{score}", ParagraphStyle("sc_num", fontName="Helvetica-Bold", fontSize=36,
                                              textColor=sc, alignment=TA_CENTER)),
        Paragraph("Appeal Strength Score\n(out of 100)", ParagraphStyle("sc_lbl", fontName="Helvetica",
                                                                          fontSize=10, textColor=MUTED,
                                                                          alignment=TA_LEFT, leading=14)),
    ]]
    score_t = Table(score_data, colWidths=[1.2 * inch, 3 * inch], hAlign="CENTER")
    score_t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 2, sc),
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
    ]))
    story.append(score_t)
    story.append(PageBreak())

    # ── PAGE 2: EXECUTIVE SUMMARY ────────────────────────────────────────────
    story.append(section_header("Executive Summary", styles))
    story.append(Spacer(1, 8))

    summary = data.get("executiveSummary", "No summary available.")
    story.append(Paragraph(summary, styles["body"]))
    story.append(Spacer(1, 12))

    # ── VALUATION SUMMARY ────────────────────────────────────────────────────
    story.append(section_header("Valuation Summary", styles))
    story.append(Spacer(1, 8))

    assessed = data.get("assessedValue")
    market = data.get("marketValueEstimate")
    gap = data.get("assessmentGap")
    savings = data.get("potentialSavings")

    val_items = [
        ("Current Assessed Value", fmt_currency(assessed), NAVY),
        ("AI Market Value Estimate", fmt_currency(market), NAVY),
    ]
    if gap and gap > 0:
        val_items.append(("Assessment Overcharge", fmt_currency(gap), RED))
    if savings and savings > 0:
        val_items.append(("Estimated Annual Tax Savings", fmt_currency(savings), GREEN))

    val_data = []
    for label, value, color in val_items:
        val_data.append([
            Paragraph(label, styles["label"]),
            Paragraph(value, ParagraphStyle("val_num", fontName="Helvetica-Bold",
                                             fontSize=12, textColor=color, alignment=TA_RIGHT)),
        ])

    val_table = Table(val_data, colWidths=[5 * inch, 2.5 * inch])
    val_table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E0DDD5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(val_table)
    story.append(Spacer(1, 14))

    # ── PROPERTY DETAILS ─────────────────────────────────────────────────────
    story.append(section_header("Property Details", styles))
    story.append(Spacer(1, 8))

    detail_pairs = []
    if data.get("squareFeet"):
        detail_pairs.append(("Square Footage", f"{int(data['squareFeet']):,} sq ft"))
    if data.get("yearBuilt"):
        detail_pairs.append(("Year Built", str(data["yearBuilt"])))
    if data.get("bedrooms"):
        detail_pairs.append(("Bedrooms", str(data["bedrooms"])))
    if data.get("bathrooms"):
        detail_pairs.append(("Bathrooms", str(data["bathrooms"])))
    if data.get("lotSize"):
        detail_pairs.append(("Lot Size", f"{data['lotSize']:,} sq ft"))
    if data.get("propertyType"):
        detail_pairs.append(("Property Type", data["propertyType"].title()))
    if data.get("county"):
        detail_pairs.append(("County", data["county"]))
    if data.get("parcelNumber"):
        detail_pairs.append(("Parcel Number", data["parcelNumber"]))

    if detail_pairs:
        # Two-column grid
        rows = []
        for i in range(0, len(detail_pairs), 2):
            left = detail_pairs[i]
            right = detail_pairs[i + 1] if i + 1 < len(detail_pairs) else ("", "")
            rows.append([
                Paragraph(left[0], styles["label"]),
                Paragraph(left[1], styles["value"]),
                Paragraph(right[0], styles["label"]),
                Paragraph(right[1], styles["value"]),
            ])
        detail_table = Table(rows, colWidths=[1.6 * inch, 2.15 * inch, 1.6 * inch, 2.15 * inch])
        detail_table.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEAFTER", (1, 0), (1, -1), 0.5, colors.HexColor("#E0DDD5")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(detail_table)
    story.append(Spacer(1, 14))

    # ── COMPARABLE SALES ─────────────────────────────────────────────────────
    comps = data.get("comparableSales", [])
    if comps:
        story.append(section_header("Comparable Sales Analysis", styles))
        story.append(Spacer(1, 8))

        comp_header = [
            Paragraph("Address", styles["label"]),
            Paragraph("Sale Price", styles["label"]),
            Paragraph("Sq Ft", styles["label"]),
            Paragraph("$/Sq Ft", styles["label"]),
            Paragraph("Sale Date", styles["label"]),
            Paragraph("Similarity", styles["label"]),
        ]
        comp_rows = [comp_header]
        for c in comps[:6]:
            price = c.get("salePrice", 0)
            sqft = c.get("squareFeet", c.get("sqft", 0))
            ppsf = int(price / sqft) if sqft else 0
            sim = c.get("similarity", 0)
            comp_rows.append([
                Paragraph(c.get("address", ""), styles["value"]),
                Paragraph(fmt_currency(price), styles["value"]),
                Paragraph(f"{int(sqft):,}" if sqft else "N/A", styles["value"]),
                Paragraph(f"${ppsf:,}" if ppsf else "N/A", styles["value"]),
                Paragraph(c.get("saleDate", ""), styles["value"]),
                Paragraph(f"{int(sim * 100)}%" if sim else "N/A", styles["value"]),
            ])

        comp_table = Table(
            comp_rows,
            colWidths=[2.4 * inch, 1.1 * inch, 0.8 * inch, 0.8 * inch, 1.1 * inch, 1.3 * inch],
        )
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CREAM]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E0DDD5")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 14))

    # ── VALUATION JUSTIFICATION ───────────────────────────────────────────────
    justification = data.get("valuationJustification", "")
    if justification:
        story.append(section_header("Valuation Methodology & Justification", styles))
        story.append(Spacer(1, 8))
        story.append(Paragraph(justification, styles["body"]))
        story.append(Spacer(1, 14))

    # ── APPEAL STRATEGY ───────────────────────────────────────────────────────
    approach = data.get("recommendedApproach", "")
    if approach:
        story.append(section_header("Recommended Appeal Strategy", styles))
        story.append(Spacer(1, 8))
        story.append(Paragraph(approach, styles["body"]))
        story.append(Spacer(1, 10))

    # Filing method
    filing = data.get("filingMethod", "")
    if filing:
        filing_map = {
            "poa": "Power of Attorney (AppraiseAI files and represents you)",
            "pro_se": "Pro Se (You file yourself with our prepared documents)",
            "consultation": "Consultation Only",
        }
        filing_label = filing_map.get(filing, filing)
        story.append(Paragraph(f"<b>Selected Filing Method:</b> {filing_label}", styles["body"]))
        story.append(Spacer(1, 6))

    # Appeal deadline
    if data.get("appealDeadline"):
        story.append(Paragraph(f"<b>Appeal Deadline:</b> {data['appealDeadline']}", styles["body"]))
        story.append(Spacer(1, 10))

    # ── NEXT STEPS ────────────────────────────────────────────────────────────
    next_steps = data.get("nextSteps", "")
    if next_steps:
        story.append(section_header("Next Steps", styles))
        story.append(Spacer(1, 8))
        # Parse numbered steps if present
        if "\n" in next_steps:
            for line in next_steps.strip().split("\n"):
                line = line.strip()
                if line:
                    story.append(Paragraph(f"• {line.lstrip('0123456789.-) ')}", styles["bullet"]))
        else:
            story.append(Paragraph(next_steps, styles["body"]))
        story.append(Spacer(1, 14))

    # ── PROPERTY CONDITION FINDINGS (from photo analysis) ────────────────────
    findings = data.get("photoFindings") or None
    if findings and isinstance(findings, dict):
        story.append(section_header("Property Condition Findings", styles))
        story.append(Spacer(1, 8))

        cond_score = findings.get("overallConditionScore", 0)
        evid_score = findings.get("overallEvidenceStrength", 0)
        cond_color = score_color(100 - cond_score)  # invert: lower condition = stronger appeal evidence

        cond_table = Table(
            [[
                Paragraph("Composite Condition Index", styles["label"]),
                Paragraph(
                    f"{cond_score}/100",
                    ParagraphStyle("cond_num", fontName="Helvetica-Bold",
                                   fontSize=12, textColor=cond_color, alignment=TA_RIGHT),
                ),
            ], [
                Paragraph("Evidence Strength", styles["label"]),
                Paragraph(
                    f"{evid_score}/100",
                    ParagraphStyle("evid_num", fontName="Helvetica-Bold",
                                   fontSize=12, textColor=NAVY, alignment=TA_RIGHT),
                ),
            ]],
            colWidths=[5 * inch, 2.5 * inch],
        )
        cond_table.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(cond_table)
        story.append(Spacer(1, 10))

        summary_para = findings.get("summaryParagraph") or ""
        if summary_para:
            story.append(Paragraph(summary_para, styles["body"]))
            story.append(Spacer(1, 8))

        observations = findings.get("topObservations") or []
        if observations:
            story.append(Paragraph("<b>Documented Observations</b>", styles["body"]))
            story.append(Spacer(1, 3))
            for obs in observations[:6]:
                story.append(Paragraph(f"• {obs}", styles["bullet"]))
            story.append(Spacer(1, 6))

        value_issues = findings.get("topValueIssues") or []
        if value_issues:
            story.append(Paragraph("<b>Value-Impacting Items</b>", styles["body"]))
            story.append(Spacer(1, 3))
            for issue in value_issues[:6]:
                story.append(Paragraph(f"• {issue}", styles["bullet"]))
            story.append(Spacer(1, 6))

        story.append(Paragraph(
            "<i>Condition findings are descriptive in nature and supplement, but do not "
            "replace, the comparable-sales analysis. Final fair-market-value conclusions "
            "are driven by the sales-comparison approach.</i>",
            styles["disclaimer"],
        ))
        story.append(Spacer(1, 14))

    # ── PROPERTY PHOTOS ───────────────────────────────────────────────────────
    photos = data.get("photos") or []
    if photos:
        story.append(PageBreak())
        story.append(section_header("Property Photos", styles))
        story.append(Spacer(1, 8))
        story.append(Paragraph(
            "Photos submitted by the property owner as supporting evidence for the appeal.",
            styles["body"]
        ))
        story.append(Spacer(1, 10))

        # Group by category, preserving input order within each group
        grouped = {}
        for p in photos:
            cat = (p.get("category") or "other").lower()
            grouped.setdefault(cat, []).append(p)

        tmp_dir = tempfile.mkdtemp(prefix="appraise-photos-")
        try:
            for cat in ("exterior", "interior", "roof", "foundation", "other"):
                items = grouped.get(cat)
                if not items:
                    continue
                story.append(Spacer(1, 6))
                story.append(Paragraph(
                    f"<b>{PHOTO_CATEGORY_LABELS.get(cat, cat.title())}</b>",
                    styles["body"]
                ))
                story.append(Spacer(1, 4))
                for photo in items:
                    url = photo.get("url")
                    if not url:
                        continue
                    path = _download_photo(url, tmp_dir)
                    if not path:
                        continue
                    try:
                        img = Image(path, width=5.5 * inch, height=3.5 * inch, kind="proportional")
                    except Exception as exc:  # noqa: BLE001
                        sys.stderr.write(f"[PDF] Failed to embed photo: {exc}\n")
                        continue
                    caption_text = photo.get("caption") or ""
                    block = [img]
                    if caption_text:
                        block.append(Spacer(1, 3))
                        block.append(Paragraph(
                            f"<i>{caption_text}</i>",
                            styles["disclaimer"]
                        ))
                    block.append(Spacer(1, 10))
                    story.append(KeepTogether(block))
        finally:
            # Temp files are kept until Python exits; ReportLab needs them until build.
            # We intentionally do NOT cleanup here — the process exits shortly after.
            pass

    # ── DISCLAIMER ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#E0DDD5"), spaceAfter=8))
    disclaimer_text = (
        "<b>Disclaimer:</b> This report is generated by AppraiseAI's AI-powered analysis platform "
        "using publicly available property records, comparable sales data, and machine learning models. "
        "It is intended for informational and property tax appeal purposes only. This report does not "
        "constitute a USPAP-compliant appraisal and should not be used for mortgage, lending, estate, "
        "or insurance purposes without review by a licensed appraiser. AppraiseAI is not a licensed "
        "appraisal firm. All valuations are estimates and may differ from actual market values. "
        "Consult a licensed real estate appraiser for official appraisal needs."
    )
    story.append(Paragraph(disclaimer_text, styles["disclaimer"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"AppraiseAI | Property Tax Appeal Specialists | appraiseai.com | "
        f"Report generated {data.get('reportDate', datetime.today().strftime('%B %d, %Y'))}",
        styles["footer"]
    ))

    doc.build(story, onFirstPage=_draw_page_chrome, onLaterPages=_draw_page_chrome)
    print(f"✅ PDF generated: {output_path}")


def _draw_page_chrome(canvas, doc):
    """Draw a thin gold rule and page number on every page."""
    canvas.saveState()
    page_w = letter[0]
    # Top gold rule
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.6)
    canvas.line(0.6 * inch, letter[1] - 0.45 * inch, page_w - 0.6 * inch, letter[1] - 0.45 * inch)
    # Footer page number
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(page_w - 0.6 * inch, 0.4 * inch, f"Page {doc.page}")
    canvas.drawString(0.6 * inch, 0.4 * inch, "AppraiseAI · Confidential")
    canvas.restoreState()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 generate_pdf.py <input_json> <output_pdf>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, "r") as f:
        report_data = json.load(f)

    generate_pdf(report_data, output_path)
