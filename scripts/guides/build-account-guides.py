#!/usr/bin/env python3
"""Build the waitlist RRSP/TFSA/FHSA PDFs.

1. Relabel the original 3-page waterfall with the current Mosaic logos.
2. Write a second 4-page field guide for side-by-side comparison.

Run from the repo root:

    python3 scripts/guides/build-account-guides.py
"""

from __future__ import annotations

from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LOGO_DIR = ROOT / "public" / "logos"
GUIDE_DIR = ROOT / "public" / "guides"
SOURCE = Path(__file__).resolve().parent / "assets" / "framework-source.pdf"
ORIGINAL = GUIDE_DIR / "rrsp-tfsa-fhsa-framework.pdf"
FIELD_GUIDE = GUIDE_DIR / "rrsp-tfsa-fhsa-field-guide.pdf"

FULL_LOGO_SRC = LOGO_DIR / "MosaicFullLogoWhiteBack.png"
EMBLEM_DARK_SRC = LOGO_DIR / "MosaicEmblemLogoWhiteBack.png"
EMBLEM_LIGHT_SRC = LOGO_DIR / "MosaicEmblemLogo.png"

ARIAL = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
ARIAL_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")

# Original ReportLab emerald, kept so the updated original still matches itself.
ORIG_EMERALD = (0.168627, 0.721569, 0.541176)
BLACK = (0, 0, 0)
WHITE = (1, 1, 1)

# Site tokens for the new field guide.
NAVY = (15 / 255, 25 / 255, 35 / 255)  # #0f1923
INK = (31 / 255, 41 / 255, 55 / 255)  # #1F2937
MUTED = (107 / 255, 114 / 255, 128 / 255)
EMERALD = (16 / 255, 185 / 255, 129 / 255)  # #10B981
EMERALD_DARK = (5 / 255, 150 / 255, 105 / 255)
MINT = (209 / 255, 250 / 255, 229 / 255)  # #D1FAE5
LINE = (232 / 255, 232 / 255, 224 / 255)
SOFT = (249 / 255, 250 / 255, 251 / 255)
RULE = (229 / 255, 231 / 255, 235 / 255)

PAGE = fitz.paper_rect("letter")
# 0.75" on all sides — clears typical home-printer hardware margins and 3-hole punch.
MARGIN = 54.0
ML, MR = MARGIN, PAGE.width - MARGIN
CONTENT_W = MR - ML
HEADER_Y = 50.0
HEADER_RULE_Y = HEADER_Y + 18.0
# 18pt titles need ~13pt cap-height below the header rule, plus a gap.
BODY_Y = HEADER_RULE_Y + 28.0
FOOTER_RULE_Y = 720.0
FOOTER_LINE1_Y = 732.0
FOOTER_LINE2_Y = 744.0


def _crop_png(src: Path, dest: Path, max_height: int = 240) -> Path:
    im = Image.open(src).convert("RGBA")
    boxed = im.crop(im.getbbox())
    if boxed.height > max_height:
        ratio = max_height / boxed.height
        boxed = boxed.resize(
            (max(1, int(boxed.width * ratio)), max_height),
            Image.Resampling.LANCZOS,
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    boxed.save(dest)
    return dest


def _tmp_logos() -> tuple[Path, Path, Path]:
    cache = Path("/tmp/mosaic-guide-logos")
    full = _crop_png(FULL_LOGO_SRC, cache / "full.png", 240)
    emblem_dark = _crop_png(EMBLEM_DARK_SRC, cache / "emblem-dark.png", 160)
    emblem_light = _crop_png(EMBLEM_LIGHT_SRC, cache / "emblem-light.png", 160)
    return full, emblem_dark, emblem_light


def _logo_rect(x: float, y: float, height: float, png: Path) -> fitz.Rect:
    with Image.open(png) as im:
        ratio = im.width / im.height
    return fitz.Rect(x, y, x + height * ratio, y + height)


def _delete_images(page: fitz.Page) -> None:
    for img in page.get_images():
        xref = img[0]
        try:
            page.delete_image(xref)
        except Exception:
            rects = page.get_image_rects(xref)
            for r in rects:
                page.draw_rect(r, color=BLACK, fill=BLACK, width=0)


def update_original_logos() -> None:
    """Keep original copy; swap in the enhanced full wordmark and emblem."""
    full, _, emblem_light = _tmp_logos()
    doc = fitz.open(SOURCE)

    # Page 1 — black hero header
    p1 = doc[0]
    _delete_images(p1)
    p1.draw_rect(fitz.Rect(50, 12, 240, 66), color=BLACK, fill=BLACK, width=0)
    p1.insert_image(_logo_rect(57.6, 16, 42, full), filename=str(full), keep_proportion=True)

    # Page 3 — black closing card (delete old wordmark first)
    p3 = doc[2]
    _delete_images(p3)
    p3.draw_rect(fitz.Rect(190, 608, 330, 656), color=BLACK, fill=BLACK, width=0)
    p3.insert_image(
        _logo_rect(214, 616, 30, full),
        filename=str(full),
        keep_proportion=True,
    )

    # Pages 2–3 running header — emblem in the left margin
    for idx in (1, 2):
        doc[idx].insert_image(
            _logo_rect(28, 10, 14, emblem_light),
            filename=str(emblem_light),
            keep_proportion=True,
        )

    doc.set_metadata(
        {
            **doc.metadata,
            "title": "RRSP vs TFSA vs FHSA Decision Framework",
            "author": "Mosaic Finance",
            "producer": "Mosaic Finance",
        }
    )
    doc.save(ORIGINAL, incremental=False, encryption=fitz.PDF_ENCRYPT_NONE, deflate=True, garbage=4)
    doc.close()


# ---------------------------------------------------------------------------
# Field guide
# ---------------------------------------------------------------------------

FONT_REG = "mf-r"
FONT_BOLD = "mf-b"


def _register(page: fitz.Page) -> None:
    page.insert_font(fontname=FONT_REG, fontfile=str(ARIAL))
    page.insert_font(fontname=FONT_BOLD, fontfile=str(ARIAL_BOLD))


def _rgb(color: tuple[float, float, float]) -> int:
    r, g, b = color
    return (int(r * 255) << 16) + (int(g * 255) << 8) + int(b * 255)


def _font(bold: bool = False) -> fitz.Font:
    return fitz.Font(fontfile=str(ARIAL_BOLD if bold else ARIAL))


def _wrap(text: str, size: float, width: float, bold: bool = False) -> list[str]:
    font = _font(bold)
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if font.text_length(trial, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def _text(
    page: fitz.Page,
    x: float,
    y: float,
    text: str,
    *,
    size: float,
    color=INK,
    bold: bool = False,
) -> None:
    page.insert_text(
        (x, y),
        text,
        fontname=FONT_BOLD if bold else FONT_REG,
        fontsize=size,
        color=color,
    )


def _block(
    page: fitz.Page,
    x: float,
    y: float,
    text: str,
    *,
    size: float,
    width: float,
    color=INK,
    bold: bool = False,
    leading: float | None = None,
) -> float:
    lh = leading or size * 1.35
    for line in _wrap(text, size, width, bold):
        _text(page, x, y, line, size=size, color=color, bold=bold)
        y += lh
    return y


def _footer(page: fitz.Page, page_no: int, total: int) -> None:
    page.draw_line(
        fitz.Point(ML, FOOTER_RULE_Y),
        fitz.Point(MR, FOOTER_RULE_Y),
        color=RULE,
        width=0.4,
    )
    _text(
        page,
        ML,
        FOOTER_LINE1_Y,
        "Educational information, not financial advice. Speak with a licensed financial advisor before implementing any changes.",
        size=6.2,
        color=MUTED,
    )
    _text(
        page,
        ML,
        FOOTER_LINE2_Y,
        f"© 2026 Mosaic Finance  ·  mosaicfinance.ai  ·  2026 tax year — confirm figures in CRA My Account  ·  {page_no}/{total}",
        size=6.2,
        color=MUTED,
    )


def _running_header(page: fitz.Page, emblem: Path) -> None:
    page.insert_image(
        _logo_rect(ML, HEADER_Y, 14, emblem),
        filename=str(emblem),
        keep_proportion=True,
    )
    _text(page, ML + 20, HEADER_Y + 10.5, "mosaicfinance.ai", size=7, color=MUTED)
    tw = _font().text_length("RRSP · TFSA · FHSA  ·  Field guide", 7)
    _text(page, MR - tw, HEADER_Y + 10.5, "RRSP · TFSA · FHSA  ·  Field guide", size=7, color=MUTED)
    page.draw_line(
        fitz.Point(ML, HEADER_RULE_Y),
        fitz.Point(MR, HEADER_RULE_Y),
        color=RULE,
        width=0.4,
    )


def _number_circle(
    page: fitz.Page,
    cx: float,
    cy: float,
    n: int,
    *,
    radius: float = 7,
    size: float = 7,
) -> None:
    """Draw a filled circle with the digit optically centered."""
    page.draw_circle(fitz.Point(cx, cy), radius, color=EMERALD, fill=EMERALD, width=0)
    label = str(n)
    size = 6.4 if n >= 10 else size
    font = _font(True)
    tw = font.text_length(label, size)
    # Arial Bold: cap-height sits ~0.72em. +0.5pt drops the digit to the optical center.
    cap = size * 0.72
    x = cx - tw / 2
    if label == "1":
        x += 0.4
    page.insert_text(
        (x, cy + cap / 2 + 0.5),
        label,
        fontname=FONT_BOLD,
        fontsize=size,
        color=WHITE,
    )


def _checkbox_row(page: fitz.Page, x: float, y: float, options: list[str]) -> None:
    cx = x
    for opt in options:
        page.draw_rect(
            fitz.Rect(cx, y - 7, cx + 8, y + 1),
            color=INK,
            fill=None,
            width=0.7,
        )
        _text(page, cx + 11, y, opt, size=8, color=INK)
        cx += 11 + _font().text_length(opt, 8) + 16


def _callout(page: fitz.Page, y: float, text: str, height: float | None = None) -> float:
    lines = _wrap(text, 8.6, CONTENT_W - 28, bold=True)
    h = height or (16 + len(lines) * 12)
    page.draw_rect(fitz.Rect(ML, y, MR, y + h), color=MINT, fill=MINT, width=0)
    page.draw_rect(fitz.Rect(ML, y, ML + 3.5, y + h), color=EMERALD, fill=EMERALD, width=0)
    ty = y + 14
    for line in lines:
        _text(page, ML + 14, ty, line, size=8.6, color=INK, bold=True)
        ty += 12
    return y + h


def _section_label(page: fitz.Page, y: float, label: str) -> float:
    _text(page, ML, y, label.upper(), size=7.5, color=EMERALD_DARK, bold=True)
    return y + 14


def build_field_guide() -> None:
    full, emblem_dark, emblem_light = _tmp_logos()
    doc = fitz.open()
    total = 4

    # ----- page 1: comparison -----
    p = doc.new_page(width=PAGE.width, height=PAGE.height)
    _register(p)
    header_top = HEADER_Y
    header_h = 118
    p.draw_rect(
        fitz.Rect(ML, header_top, MR, header_top + header_h),
        color=NAVY,
        fill=NAVY,
        width=0,
    )
    p.draw_rect(
        fitz.Rect(ML, header_top, MR, header_top + 3),
        color=EMERALD,
        fill=EMERALD,
        width=0,
    )
    p.insert_image(
        _logo_rect(ML + 16, header_top + 12, 28, full),
        filename=str(full),
        keep_proportion=True,
    )
    _text(p, ML + 16, header_top + 58, "RRSP, TFSA, and FHSA", size=22, color=WHITE, bold=True)
    _text(
        p,
        ML + 16,
        header_top + 76,
        "How the three Canadian accounts differ",
        size=11,
        color=EMERALD,
    )
    _block(
        p,
        ML + 16,
        header_top + 94,
        "Educational information, not financial advice. This guide explains contribution room, tax treatment, and tracking gaps. It is not a pick of which account to use.",
        size=8,
        width=CONTENT_W - 32,
        color=(0.75, 0.78, 0.82),
        leading=10.8,
    )
    y = header_top + header_h + 16
    y = _section_label(p, y, "Side-by-side")

    headers = ["", "RRSP", "TFSA", "FHSA"]
    rows = [
        [
            "Money in",
            "Contribution is deductible.",
            "Contribution is after-tax.",
            "Contribution is deductible.",
        ],
        [
            "Growth",
            "Tax-deferred until withdrawn.",
            "Not taxed.",
            "Not taxed.",
        ],
        [
            "Money out",
            "Taxed as ordinary income.",
            "Not taxed for a Canadian resident.",
            "Not taxed on a qualifying first-home withdrawal.",
        ],
        [
            "2026 room",
            "18% of prior-year earned income, ceiling $33,810.",
            "$7,000 for the year, plus unused room.",
            "$8,000 for the year once the account is open.",
        ],
        [
            "After a withdrawal",
            "That contribution room is not restored.",
            "Room returns on January 1 of the next calendar year.",
            "A qualifying withdrawal does not restore FHSA room.",
        ],
        [
            "OAS / GIS",
            "Withdrawals count as income.",
            "Withdrawals do not count as income.",
            "A qualifying first-home withdrawal does not count as income.",
        ],
        [
            "First home",
            "Home Buyers' Plan: up to $60,000, with repayment rules.",
            "No dedicated first-home program.",
            "Qualifying withdrawal for a first home. Lifetime room $40,000.",
        ],
        [
            "Clock",
            "Must convert to a RRIF by Dec 31 of the year you turn 71.",
            "No forced withdrawals at a set age.",
            "15-year participation period starts the year you open.",
        ],
    ]
    col_w = [92, 137, 137, 138]
    x0 = ML
    header_h = 18
    # header row
    p.draw_rect(fitz.Rect(x0, y, MR, y + header_h), color=NAVY, fill=NAVY, width=0)
    x = x0
    for i, h in enumerate(headers):
        if h:
            _text(p, x + 6, y + 12.5, h, size=8, color=WHITE, bold=True)
        x += col_w[i]
    y += header_h

    cell_size = 7.1
    for r_i, row in enumerate(rows):
        wrapped = [
            _wrap(cell, cell_size, col_w[c] - 12, bold=(c == 0)) for c, cell in enumerate(row)
        ]
        row_h = max(12 + max(len(w) * 9.4, 9.4) for w in wrapped)
        bg = SOFT if r_i % 2 == 0 else WHITE
        p.draw_rect(fitz.Rect(x0, y, MR, y + row_h), color=bg, fill=bg, width=0)
        p.draw_line(fitz.Point(x0, y + row_h), fitz.Point(MR, y + row_h), color=RULE, width=0.3)
        x = x0
        for c, lines in enumerate(wrapped):
            ty = y + 10
            for line in lines:
                _text(
                    p,
                    x + 6,
                    ty,
                    line,
                    size=cell_size,
                    color=INK,
                    bold=(c == 0),
                )
                ty += 9.4
            x += col_w[c]
        y += row_h

    y += 14
    y = _section_label(p, y, "Worked illustration — not a forecast")
    y = _callout(
        p,
        y,
        "$10,000 contributed while in a 40% federal+provincial bracket, later withdrawn in a 25% bracket, does not have the same after-tax result in an RRSP as in a TFSA. The gap is the tax treatment — not a projection of returns, and not a pick of which account to use.",
    )
    y += 10
    y = _block(
        p,
        ML,
        y,
        "Run a hypothetical income on mosaicfinance.ai/calculators/rrsp-vs-tfsa and mosaicfinance.ai/calculators/fhsa. Confirm your own room in CRA My Account.",
        size=8,
        width=CONTENT_W,
        color=MUTED,
        leading=11,
    )
    y += 16
    y = _section_label(p, y, "Inside this guide")
    insides = [
        ("02", "2026 limits and clocks", "Room, deadlines, and the FHSA 15-year period."),
        ("03", "A snapshot you can fill in", "CRA room, match, first home, tracking gaps."),
        ("04", "Questions for a licensed advisor", "Take them to a licensed financial advisor."),
    ]
    card_w = (CONTENT_W - 16) / 3
    for i, (num, title, blurb) in enumerate(insides):
        x = ML + i * (card_w + 8)
        p.draw_rect(fitz.Rect(x, y, x + card_w, y + 58), color=SOFT, fill=SOFT, width=0)
        _text(p, x + 10, y + 16, num, size=8, color=EMERALD_DARK, bold=True)
        _text(p, x + 10, y + 32, title, size=8.4, color=NAVY, bold=True)
        _block(p, x + 10, y + 44, blurb, size=7.2, width=card_w - 20, color=MUTED, leading=9.5)
    _footer(p, 1, total)

    # ----- page 2: 2026 limits & clocks -----
    p = doc.new_page(width=PAGE.width, height=PAGE.height)
    _register(p)
    _running_header(p, emblem_light)
    y = BODY_Y
    _text(p, ML, y, "2026 limits and clocks", size=18, color=NAVY, bold=True)
    y += 16
    y = _block(
        p,
        ML,
        y,
        "Figures below are the 2026 tax-year rules as published for a typical resident of Canada. Your CRA My Account number is the source of truth. Unused room, pension adjustments, and over-contributions change the result.",
        size=8.6,
        width=CONTENT_W,
        color=MUTED,
        leading=11.6,
    )
    y += 10

    cards = [
        (
            "TFSA",
            [
                "2026 annual limit: $7,000.",
                "Cumulative if eligible every year since 2009: $109,000.",
                "New room is added on January 1.",
                "A withdrawal is allowed. That amount of room returns on January 1 of the following year — not the same year.",
            ],
        ),
        (
            "RRSP",
            [
                "2026 dollar ceiling: $33,810.",
                "Room is generally 18% of prior-year earned income, minus pension adjustment, plus unused room.",
                "Deadline to contribute for the 2026 tax year: March 1, 2027.",
                "You can claim the deduction in the current year or carry it forward.",
            ],
        ),
        (
            "FHSA",
            [
                "Annual limit: $8,000. Lifetime limit: $40,000.",
                "Unused annual room carries forward up to $8,000, so one year can be as high as $16,000, still inside the lifetime cap.",
                "The 15-year participation period starts in the year you open the account. You must close it by the end of the year you turn 71.",
                "Opening starts both the room and the clock. It is not a costless option with no expiry.",
            ],
        ),
    ]
    gap = 10
    card_w = (CONTENT_W - 2 * gap) / 3
    card_h = 168
    for i, (title, bullets) in enumerate(cards):
        x = ML + i * (card_w + gap)
        p.draw_rect(fitz.Rect(x, y, x + card_w, y + card_h), color=SOFT, fill=SOFT, width=0)
        p.draw_rect(fitz.Rect(x, y, x + card_w, y + 3), color=EMERALD, fill=EMERALD, width=0)
        _text(p, x + 10, y + 20, title, size=11, color=NAVY, bold=True)
        by = y + 36
        for bullet in bullets:
            by = _block(p, x + 10, by, bullet, size=7.3, width=card_w - 20, color=INK, leading=10.2)
            by += 4
    y += card_h + 16

    y = _section_label(p, y, "Related mechanisms — not a ranking")
    y = _block(
        p,
        ML,
        y,
        "Home Buyers' Plan (RRSP): up to $60,000, with eligibility and repayment rules of its own. CESG on an RESP: 20% on the first $2,500 contributed in a year, with catch-up room in some years, lifetime CESG of $7,200, and a $50,000 lifetime RESP contribution cap. These are separate from the three-account comparison on page 1.",
        size=8.5,
        width=CONTENT_W,
        color=INK,
        leading=11.6,
    )
    y += 12
    y = _section_label(p, y, "Clocks that are easy to miss")
    facts = [
        "TFSA and RRSP over-contributions can attract a 1% per-month tax on the excess (RRSP has a $2,000 lifetime buffer for most adults).",
        "Beneficiary designations on registered accounts generally override a will. A spouse or common-law partner can be named as TFSA successor holder so the account continues; other beneficiaries receive a payout, not a continuing TFSA.",
        "Combined federal + provincial rates differ by province. That changes the RRSP vs TFSA tax-treatment math without changing the account rules.",
        "Group RRSP and defined-contribution pension contributions create a pension adjustment that reduces personal RRSP room.",
        "CRA My Account TFSA room can lag issuer reporting. Use your own records as well as the CRA figure.",
    ]
    for i, fact in enumerate(facts, start=1):
        _number_circle(p, ML + 7, y + 1, i)
        y = _block(p, ML + 22, y, fact, size=8.4, width=CONTENT_W - 22, color=INK, leading=11.4)
        y += 8

    _footer(p, 2, total)

    # ----- page 3: snapshot + tracking gaps -----
    p = doc.new_page(width=PAGE.width, height=PAGE.height)
    _register(p)
    _running_header(p, emblem_light)
    y = BODY_Y
    _text(p, ML, y, "Your snapshot", size=18, color=NAVY, bold=True)
    y += 16
    y = _block(
        p,
        ML,
        y,
        "Fill this from CRA My Account and your own records. The filled page is something you can keep, take to a licensed advisor, or type into Mosaic tracking. Mosaic is not filling it in for you, and a completed page is not a recommendation.",
        size=8.6,
        width=CONTENT_W,
        color=MUTED,
        leading=11.6,
    )
    y += 10

    def line_field(label: str, y0: float, prefix: str = "") -> float:
        _text(p, ML + 14, y0 + 12, label, size=8.3, color=INK, bold=True)
        lx = ML + 14 + _font(True).text_length(label, 8.3) + 10
        if prefix:
            _text(p, lx, y0 + 12, prefix, size=8.3, color=MUTED)
            lx += _font().text_length(prefix + " ", 8.3)
        p.draw_line(fitz.Point(lx, y0 + 13), fitz.Point(MR - 16, y0 + 13), color=MUTED, width=0.7)
        return y0 + 22

    def choice_field(label: str, y0: float, options: list[str]) -> float:
        _text(p, ML + 14, y0 + 12, label, size=8.3, color=INK, bold=True)
        _checkbox_row(p, ML + 14, y0 + 30, options)
        return y0 + 42

    box_top = y
    box_h = 316
    p.draw_rect(fitz.Rect(ML, box_top, MR, box_top + box_h), color=SOFT, fill=SOFT, width=0)
    cursor = box_top + 8
    cursor = line_field("Province", cursor)
    cursor = line_field("Combined marginal bracket (or “not sure”)", cursor)
    cursor = choice_field("Employer match on an RRSP or DC pension?", cursor, ["Yes", "No", "Not sure"])
    cursor = choice_field("First-home buyer under CRA’s FHSA / HBP tests?", cursor, ["Yes", "No", "Not sure"])
    cursor = line_field("High-interest balances (cards, unsecured LOC)", cursor, "$")
    cursor = line_field("TFSA contribution room (CRA)", cursor, "$")
    cursor = line_field("RRSP deduction limit (CRA)", cursor, "$")
    cursor = choice_field("FHSA opened?", cursor, ["Yes", "No"])
    cursor = line_field("Remaining FHSA room", cursor, "$")
    cursor = choice_field("Emergency cash currently sitting inside a TFSA?", cursor, ["Yes", "No"])
    y = box_top + box_h + 14

    y = _section_label(p, y, "Tracking gaps when you only look at one account")
    gaps = [
        (
            "Emergency cash inside a TFSA",
            "A withdrawal this year is allowed. That room does not come back until January 1 of the next calendar year. The brokerage app can still look “fine” because the withdrawal succeeded.",
        ),
        (
            "An FHSA that was never opened",
            "Annual FHSA room does not start until the account exists. Unused room can carry forward after opening (capped), but a year with no account is a year with no FHSA room.",
        ),
        (
            "Unused RRSP deduction",
            "A contribution and the deduction you claim can sit in different years. The unused deduction is easy to lose in a spreadsheet that only shows account balances.",
        ),
        (
            "Brokerage room vs CRA room",
            "The number in an app is not always the CRA figure. Over-contributions are assessed against CRA room, and TFSA records can lag until issuers report.",
        ),
    ]
    for title, body in gaps:
        body_lines = _wrap(body, 8.2, CONTENT_W - 18)
        h = 16 + len(body_lines) * 11.2 + 10
        p.draw_rect(fitz.Rect(ML, y, ML + 3.5, y + h), color=EMERALD, fill=EMERALD, width=0)
        _text(p, ML + 14, y + 11, title, size=9, color=NAVY, bold=True)
        y = _block(p, ML + 14, y + 23, body, size=8.2, width=CONTENT_W - 18, color=INK, leading=11.2)
        y += 10

    _footer(p, 3, total)

    # ----- page 4: questions + product bridge -----
    p = doc.new_page(width=PAGE.width, height=PAGE.height)
    _register(p)
    _running_header(p, emblem_light)
    y = BODY_Y
    _text(p, ML, y, "Questions to bring to a licensed advisor", size=18, color=NAVY, bold=True)
    y += 16
    y = _block(
        p,
        ML,
        y,
        "These are questions, not a to-do list from Mosaic, and not a suggestion of which account to use.",
        size=8.6,
        width=CONTENT_W,
        color=MUTED,
        leading=11.6,
    )
    y += 10
    questions = [
        "How does my current combined tax bracket compare with what I might face in retirement?",
        "Do I have an employer match, and what are the vesting and pension-adjustment rules?",
        "How do FHSA eligibility and the 15-year participation period apply to my situation?",
        "What happens to OAS or GIS if RRSP or RRIF income shows up later?",
        "How should TFSA room and emergency cash be tracked as separate numbers?",
        "If I have a spouse or common-law partner, how do successor-holder versus beneficiary designations work on each account?",
        "How does my province change the RRSP vs TFSA tax-treatment math?",
        "What is the repayment schedule if I have used, or might use, the Home Buyers' Plan?",
        "Are there over-contribution issues on file with CRA?",
        "Which of these accounts do I already have, and what is the CRA room on each?",
    ]
    for i, q in enumerate(questions, start=1):
        _number_circle(p, ML + 7, y + 1, i)
        y = _block(p, ML + 22, y, q, size=8.6, width=CONTENT_W - 22, color=INK, leading=11.4)
        y += 6

    y += 8
    y = _section_label(p, y, "When this snapshot is not enough")
    y = _block(
        p,
        ML,
        y,
        "Incorporation or salary-versus-dividend questions, cross-border income or assets, retirement-income timing (CPP, OAS, RRIF), inheritances, blended families, and insurance needs usually require a licensed financial advisor and, where relevant, a tax professional. This PDF does not cover them.",
        size=8.4,
        width=CONTENT_W,
        color=INK,
        leading=11.4,
    )
    y += 14

    cta_h = 118
    cta_top = FOOTER_RULE_Y - 14 - cta_h
    p.draw_rect(fitz.Rect(ML, cta_top, MR, cta_top + cta_h), color=NAVY, fill=NAVY, width=0)
    p.draw_rect(fitz.Rect(ML, cta_top, MR, cta_top + 3), color=EMERALD, fill=EMERALD, width=0)
    p.insert_image(
        _logo_rect(ML + 18, cta_top + 16, 22, full),
        filename=str(full),
        keep_proportion=True,
    )
    _text(
        p,
        ML + 18,
        cta_top + 56,
        "Track these numbers in one place.",
        size=12,
        color=WHITE,
        bold=True,
    )
    _block(
        p,
        ML + 18,
        cta_top + 72,
        "Mosaic is Canadian financial tracking and education. Budgets, net worth, holdings, and the live Financial Health Score stay free on Pulse. Charlie is your AI money guide on Progress — educational analysis, not advice. mosaicfinance.ai",
        size=8,
        width=CONTENT_W - 36,
        color=(0.80, 0.84, 0.86),
        leading=11,
    )

    _footer(p, 4, total)

    doc.set_metadata(
        {
            "title": "RRSP, TFSA, and FHSA — How the three Canadian accounts differ",
            "author": "Mosaic Finance",
            "subject": "Educational field guide. Not financial advice.",
            "keywords": "RRSP, TFSA, FHSA, Canada, education",
            "creator": "Mosaic Finance",
            "producer": "Mosaic Finance",
        }
    )
    FIELD_GUIDE.parent.mkdir(parents=True, exist_ok=True)
    try:
        doc.subset_fonts()
    except Exception:
        pass
    doc.save(FIELD_GUIDE, deflate=True, garbage=4)
    doc.close()


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source guide: {SOURCE}")
    update_original_logos()
    build_field_guide()
    print(f"Updated logos: {ORIGINAL}")
    print(f"New field guide: {FIELD_GUIDE}")


if __name__ == "__main__":
    main()
