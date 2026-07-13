from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
import json
import re
import sys

import pdfplumber
import pypdfium2 as pdfium

sys.stdout.reconfigure(encoding="utf-8")

PDFS = [
    Path(r"C:\Users\Z18382\Downloads\P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf"),
    Path(r"C:\Users\Z18382\Downloads\P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf"),
    Path(r"C:\Users\Z18382\Downloads\P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf"),
]

OUT_JSON = Path("outputs/picos_boxes/pdf_activity_boxes_extracted.json")
OUT_IMAGE_DIR = Path("public/picos-boxes")


@dataclass
class ActivityBox:
    customer: str
    source_file: str
    box: str
    core_box: str
    mode: str
    activity: str
    on_ad: str
    confidence_pct: int
    support: str
    window: str
    display_type: str
    location: str
    location_guidance: str
    pack_size_status: str
    pack_sizes_stated: str
    sku_status: str
    skus_stated: str
    execution_detail: str
    verification_scale: str
    source_pages: str
    source_image: str
    optimization_note: str
    raw_text: str


def color_kind(color) -> str | None:
    if not color or len(color) < 3:
        return None
    r, g, b = color[:3]
    if r > 0.65 and g < 0.12 and b < 0.12:
        return "Execute"
    if abs(r - g) < 0.05 and abs(g - b) < 0.05 and 0.35 <= r <= 0.95:
        return "Sell"
    return None


def normalize(text: str) -> str:
    text = text.replace("\u2010", "-").replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_customer(pdf: Path) -> str:
    name = pdf.stem
    m = re.search(r"P-\d+_(.+?) CCNA", name)
    return m.group(1).strip() if m else name


def classify_display_type(text: str) -> str:
    low = text.lower()
    if "cooler" in low or "cold vault" in low:
        return "Cooler"
    if "shipper" in low or "pdq" in low:
        return "Shipper"
    return "Display"


def extract_location(text: str) -> tuple[str, str]:
    clean = normalize(text)
    loc_patterns = [
        r"(?:Execute|Execution|Merchandise|Display|Location|Locations|Action)\s*:\s*([^.;]{8,180})",
        r"(?:placed|place|set)\s+(?:in|on|at)\s+([^.;]{8,140})",
    ]
    for pattern in loc_patterns:
        m = re.search(pattern, clean, flags=re.IGNORECASE)
        if m:
            guidance = m.group(1).strip(" -")
            return categorize_location(guidance), guidance

    keywords = [
        "beverage aisle",
        "perimeter",
        "lobby",
        "endcap",
        "end cap",
        "cooler",
        "checkout",
        "backroom",
        "front",
        "destination coke",
    ]
    found = [kw for kw in keywords if kw in clean.lower()]
    if found:
        guidance = "; ".join(dict.fromkeys(found))
        return categorize_location(guidance), guidance
    return "Not stated", "Not explicitly stated"


def categorize_location(guidance: str) -> str:
    low = guidance.lower()
    if "aisle" in low:
        return "Aisle"
    if "perimeter" in low:
        return "Perimeter"
    if "lobby" in low:
        return "Lobby"
    if "checkout" in low or "front" in low:
        return "Front End / Checkout"
    if "cooler" in low or "cold vault" in low:
        return "Cooler"
    if "backroom" in low:
        return "Backroom"
    if "endcap" in low or "end cap" in low:
        return "Endcap"
    return "Display area"


def extract_window(text: str) -> str:
    m = re.search(r"(\d{1,2}/\d{1,2}\s*-\s*\d{1,2}/\d{1,2}|\d{1,2}/\d{1,2}/\d{2,4}\s*[-–]\s*\d{1,2}/\d{1,2}/\d{2,4})", text)
    return normalize(m.group(1)) if m else "Not stated"


def extract_pack_sizes(text: str) -> tuple[str, str]:
    patterns = [
        r"\b\d+(?:\.\d+)?\s?(?:oz|ltr|l|L)\b",
        r"\b\d+\s?pk\b",
        r"\b\d+\s?pack\b",
        r"\b\d+\s?ct\b",
        r"\b\d+pk[- ]?cans\b",
        r"\b\d+pk[- ]?minis\b",
    ]
    vals: list[str] = []
    for pat in patterns:
        vals.extend(re.findall(pat, text, flags=re.IGNORECASE))
    cleaned = []
    for val in vals:
        val = normalize(val)
        if val.lower() not in [x.lower() for x in cleaned]:
            cleaned.append(val)
    if cleaned:
        return "Explicit", "; ".join(cleaned[:8])
    return "Variable / optimize", "Not explicitly stated"


SKU_WORDS = [
    "Coke", "Coca-Cola", "Coke Zero", "Diet Coke", "Sprite", "Fanta", "BODYARMOR", "Body Armor",
    "POWERADE", "Smartwater", "Topo Chico", "Monster", "Gold Peak", "Minute Maid", "Dasani",
    "Barq", "Fresca", "Dr Pepper"
]


def extract_skus(text: str) -> tuple[str, str]:
    found = []
    for sku in SKU_WORDS:
        if re.search(rf"\b{re.escape(sku)}\b", text, flags=re.IGNORECASE):
            found.append(sku)
    # normalize duplicate family references
    deduped = []
    for sku in found:
        if sku.lower() not in [x.lower() for x in deduped]:
            deduped.append(sku)
    if deduped:
        return "Explicit", "; ".join(deduped)
    return "Variable / optimize", "Not explicitly stated"


def extract_verification(text: str) -> str:
    cases = re.findall(r"(?:~|approximately|approx\.?)?\s*\d+\+?\s?(?:cases|cs)\b", text, flags=re.IGNORECASE)
    if cases:
        return normalize("; ".join(dict.fromkeys(cases))[:180])
    if re.search(r"\b100%\b", text):
        return "100% store execution noted"
    return "Not explicitly stated"


def extract_activity(text: str, mode: str, index: int) -> str:
    clean = normalize(text)
    m = re.search(rf"\b{mode}\s*:?\s*([^|•\n]{{5,90}})", clean, flags=re.IGNORECASE)
    if m:
        return normalize(m.group(1)).strip("-: ")
    # use first meaningful line-like fragment after sheet label
    clean = re.sub(r"^(?:OnAd\s*)?(?:Late Break\s*)?Sell Sheet\s*\d+\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"^[EXCUTSLH\s]+", "", clean).strip()
    return clean[:70].strip(" -:") or f"{mode} Activity {index}"


def support_type(text: str, mode: str) -> str:
    low = text.lower()
    if "hq support" in low:
        return "Customer HQ Support Letter"
    if "rollback" in low or "price" in low or "$" in text:
        return "Price / Retail Support"
    if "shipper" in low:
        return "Shipper or POI"
    if mode == "Execute":
        return "Feature Space Support"
    return "Sell-in Opportunity"


def on_ad_value(text: str, mode: str) -> str:
    if "onad" in text.lower() or mode == "Execute":
        return "Yes"
    return "No"


def core_box(mode: str) -> str:
    return "Yes" if mode in {"Execute", "Sell"} else "No"


def optimization_note(mode: str, sku_status: str, pack_status: str, display_type: str, location: str) -> str:
    notes = []
    if mode == "Sell":
        notes.append("Sell activity captured from grey box; validate conversion into executable PicOS recommendation.")
    else:
        notes.append("Execute activity captured from red box.")
    if sku_status != "Explicit":
        notes.append("SKU mix should be optimized from available backend/product data.")
    if pack_status != "Explicit":
        notes.append("Pack size not explicit; resolve from activity context or backend input.")
    notes.append(f"Display type classified as {display_type}; location classified as {location}.")
    return " ".join(notes)


def crop_text(page, rect) -> str:
    pad = 3
    bbox = (
        max(0, rect["x0"] + pad),
        max(0, rect["top"] + pad),
        min(page.width, rect["x1"] - pad),
        min(page.height, rect["bottom"] - pad),
    )
    try:
        return normalize(page.crop(bbox).extract_text(x_tolerance=2, y_tolerance=3) or "")
    except Exception:
        return ""


def safe_file_stem(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "activity"


def crop_activity_image(pdf: Path, page_no: int, rect, image_index: int) -> str:
    OUT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    scale = 2.5
    pad = 5
    document = pdfium.PdfDocument(str(pdf))
    try:
        page = document[page_no - 1]
        image = page.render(scale=scale).to_pil()
        crop_box = (
            max(0, int((rect["x0"] - pad) * scale)),
            max(0, int((rect["top"] - pad) * scale)),
            min(image.width, int((rect["x1"] + pad) * scale)),
            min(image.height, int((rect["bottom"] + pad) * scale)),
        )
        crop = image.crop(crop_box)
        file_name = f"{safe_file_stem(pdf.stem)}-p{page_no:02d}-{image_index:02d}.png"
        output_path = OUT_IMAGE_DIR / file_name
        crop.save(output_path, optimize=True)
        return f"/picos-boxes/{file_name}"
    finally:
        document.close()


def is_activity_rect(rect) -> bool:
    kind = color_kind(rect.get("non_stroking_color") or rect.get("stroking_color"))
    if kind is None:
        return False
    width = rect["x1"] - rect["x0"]
    height = rect["bottom"] - rect["top"]
    return width >= 95 and height >= 70


def extract() -> list[ActivityBox]:
    boxes: list[ActivityBox] = []
    for pdf in PDFS:
        customer = detect_customer(pdf)
        with pdfplumber.open(pdf) as doc:
            for page_no, page in enumerate(doc.pages, start=1):
                candidates = []
                for rect in page.rects:
                    if is_activity_rect(rect):
                        kind = color_kind(rect.get("non_stroking_color") or rect.get("stroking_color"))
                        candidates.append((rect, kind))

                # Drop duplicate same-box borders by de-duping close coordinates.
                seen: set[tuple[int, int, int, int]] = set()
                unique = []
                for rect, kind in sorted(candidates, key=lambda item: (item[0]["top"], item[0]["x0"])):
                    key = (round(rect["x0"] / 4), round(rect["top"] / 4), round(rect["x1"] / 4), round(rect["bottom"] / 4))
                    if key in seen:
                        continue
                    seen.add(key)
                    unique.append((rect, kind))

                for page_box_index, (rect, mode) in enumerate(unique, start=1):
                    text = crop_text(page, rect)
                    if len(text) < 20:
                        continue
                    idx = len(boxes) + 1
                    activity = extract_activity(text, mode, idx)
                    pack_status, packs = extract_pack_sizes(text)
                    sku_status, skus = extract_skus(text)
                    location, guidance = extract_location(text)
                    display_type = classify_display_type(text)
                    box_label_match = re.search(r"(OnAd\s*\d+|Late Break\s*\d+|Sell Sheet\s*\d+|Sheet\s*\d+)", text, flags=re.IGNORECASE)
                    box_label = normalize(box_label_match.group(1)) if box_label_match else f"{mode} Box {idx}"
                    boxes.append(ActivityBox(
                        customer=customer,
                        source_file=pdf.name,
                        box=box_label,
                        core_box=core_box(mode),
                        mode=mode,
                        activity=activity,
                        on_ad=on_ad_value(text, mode),
                        confidence_pct=90 if mode == "Sell" else 95,
                        support=support_type(text, mode),
                        window=extract_window(text),
                        display_type=display_type,
                        location=location,
                        location_guidance=guidance,
                        pack_size_status=pack_status,
                        pack_sizes_stated=packs,
                        sku_status=sku_status,
                        skus_stated=skus,
                        execution_detail=text[:500],
                        verification_scale=extract_verification(text),
                        source_pages=f"Page {page_no}",
                        source_image=crop_activity_image(pdf, page_no, rect, page_box_index),
                        optimization_note=optimization_note(mode, sku_status, pack_status, display_type, location),
                        raw_text=text,
                    ))
    return boxes


if __name__ == "__main__":
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    data = [asdict(box) for box in extract()]
    OUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(data)} boxes to {OUT_JSON}")
    summary = {}
    for row in data:
        summary.setdefault(row["source_file"], {"Execute": 0, "Sell": 0})
        summary[row["source_file"]][row["mode"]] += 1
    print(json.dumps(summary, indent=2))
