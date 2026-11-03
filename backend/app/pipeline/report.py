"""One-page PDF for the family or an OT: summary, prioritized fixes, and the re-film result if there is one."""

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app import store

SEV = {3: "Fix today", 2: "This week", 1: "Worth knowing"}


def build(scan: dict, comparison: dict | None = None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    ss = getSampleStyleSheet()
    small = ss["BodyText"].clone("small", fontSize=8.5, leading=10.5)
    story = [
        Paragraph(f"SafeNest home fall-risk check: {scan['title']}", ss["Title"]),
        Paragraph(scan["summary"], ss["BodyText"]),
        Spacer(1, 8),
    ]

    active = sorted(
        [h for h in scan["hazards"] if h["lane"] in ("verified", "needs_check")], key=lambda h: -h["severity"]
    )
    rows = [["Priority", "Hazard", "Fix", "Cost"]]
    for h in active:
        lo, hi = h["fix"]["est_cost_usd"]
        tag = " (check in person)" if h["lane"] == "needs_check" else ""
        rows.append(
            [
                SEV[h["severity"]],
                Paragraph(h["title"] + tag, small),
                Paragraph(h["fix"]["action"], small),
                f"${lo:.0f}-{hi:.0f}",
            ]
        )
    t = Table(rows, colWidths=[0.9 * inch, 2.6 * inch, 3.0 * inch, 0.8 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story += [t, Spacer(1, 8)]

    thumbs = [h for h in active if h["evidence"]][:3]
    if thumbs:
        cells = []
        for h in thumbs:
            p = store.frame_dir(scan["scan_id"]) / f"{h['evidence'][0]['frame_idx']}.jpg"
            cells.append([Image(str(p), width=2.2 * inch, height=1.4 * inch), Paragraph(h["title"], small)])
        story += [Table([[c[0] for c in cells], [c[1] for c in cells]]), Spacer(1, 6)]

    rejected = [h for h in scan["hazards"] if h["lane"] == "rejected"]
    if rejected:
        story.append(
            Paragraph(
                f"{len(rejected)} AI claim(s) were dropped because the segmentation model found no "
                "evidence in the video: " + "; ".join(h["title"] for h in rejected) + ".",
                small,
            )
        )
    if comparison:
        fixed = sum(i["status"] == "fixed" for i in comparison["items"])
        story += [
            Spacer(1, 6),
            Paragraph(
                f"Re-check: {fixed} hazard(s) fixed. Risk score "
                f"{comparison['score_before']} → {comparison['score_after']}.",
                ss["Heading3"],
            ),
        ]
    story += [
        Spacer(1, 6),
        Paragraph(
            "SafeNest is a checklist aid based on the CDC STEADI home-safety checklist, "
            "not a medical assessment. An occupational therapist can do a full evaluation.",
            small,
        ),
    ]
    doc.build(story)
    return buf.getvalue()
