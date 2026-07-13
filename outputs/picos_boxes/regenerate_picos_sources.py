from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

PDF_JSON = Path("outputs/picos_boxes/pdf_activity_boxes_extracted.json")
CSV_PATH = Path(r"C:\Users\Z18382\Downloads\arizona_ui_output (2).csv")
OUT_TS = Path("src/data/picosStores.ts")
TOP_CANDIDATES = 48
EXPLICIT_SKU_CANDIDATES = 64

CUSTOMER_MAP = {
    "WAL-MART STORES INC": "WALMART SC  5189",
    "FAMILY DOLLAR": "FAMILY DOLLAR  11796",
    "CIRCLE K GREAT LAKES": "CIRCLE K  2708833",
}

LLM_ACTIVITY_OVERRIDES: dict[tuple[str, str], dict[str, str]] = {
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 1"): {
        "pack_size_status": "Explicit",
        "pack_sizes_stated": "1.25L; 7.5oz; 10pk",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 5"): {
        "location": "Display area",
        "location_guidance": "Action Alley; pallet; floor stack",
        "pack_sizes_stated": "12oz; 24pk",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 8"): {
        "display_type": "Display",
        "location": "Display area",
        "location_guidance": "Hanging rack; wing rack; cooler; HRACK",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 9"): {
        "location_guidance": "Stack base; half stack; end cap",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 10"): {
        "display_type": "Display",
        "location": "Display area",
        "location_guidance": "Shared end cap; cooler; wing rack",
        "pack_sizes_stated": "12oz",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 13"): {
        "location_guidance": "Stack base; half stack; end cap",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 14"): {
        "pack_sizes_stated": "20oz",
        "location_guidance": "End cap; wing rack; half stack; cold placement",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 16"): {
        "location": "Display area",
        "location_guidance": "Dump Bin; PDQ Bin",
    },
    ("P-001110_WAL-MART STORES INC CCNA_7-1-7-31.pdf", "Sell Sheet 17"): {
        "location": "Garden Center",
        "location_guidance": "Garden Center split pallet",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 1"): {
        "pack_sizes_stated": "500ml; 6pk",
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 3"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 5"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 6"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 7"): {
        "display_type": "Display",
        "location": "Perimeter",
        "location_guidance": "Perimeter portfolio display; end cap",
        "skus_stated": "Fanta; Coke; Coke Zero; Sprite",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 8"): {
        "skus_stated": "Sprite + Tea",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 9"): {
        "skus_stated": "Sprite + Tea",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 10"): {
        "display_type": "Display",
        "location": "Endcap",
        "location_guidance": "Endcap front of store or middle; ambient display; cooler display",
        "skus_stated": "Coke; Sprite + Tea",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 11"): {
        "display_type": "Display",
        "location": "Endcap",
        "location_guidance": "Destination Coke ambient endcap; front of store; middle; cooler display",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 31"): {
        "pack_size_status": "Explicit",
        "pack_sizes_stated": "20oz; 8pk",
        "location": "Aisle",
        "location_guidance": "Water set over 12ft",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 15"): {
        "skus_stated": "Smartwater",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 16"): {
        "display_type": "Display",
        "location": "Perimeter",
        "location_guidance": "Perimeter portfolio display; End Cap; Marketing kit header",
        "skus_stated": "Fanta; Coke; Coke Zero; Sprite",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Late Break 17"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
        "pack_size_status": "Inferred",
        "pack_sizes_stated": "12oz; 12pk",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 35"): {
        "location_guidance": "Beverage aisle; Destination Coke Endcap; Perm endcaps; LTL FlexSpace",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Sheet 20"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Fanta",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 37"): {
        "location_guidance": "Beverage aisle; Destination Coke Endcap; Perm endcaps; LTL FlexSpace",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 38"): {
        "skus_stated": "Gold Peak; Smartwater; Vitamin Water",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 39"): {
        "skus_stated": "Smartwater",
    },
    ("P-000727_FAMILY DOLLAR CCNA_7-1-7-31.pdf", "Sell Box 42"): {
        "pack_size_status": "Explicit",
        "pack_sizes_stated": "20oz; 8pk",
        "location": "Aisle",
        "location_guidance": "Water set over 11ft",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 1"): {
        "pack_size_status": "Explicit",
        "pack_sizes_stated": "12pk; 15pk",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 2"): {
        "skus_stated": "Coca-Cola; Coke Zero",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 3"): {
        "pack_size_status": "Inferred",
        "pack_sizes_stated": "Mini Can",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 4"): {
        "sku_status": "Explicit",
        "skus_stated": "fairlife",
        "location": "Cooler",
        "location_guidance": "Cold Vault",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "OnAd 6"): {
        "sku_status": "Explicit",
        "skus_stated": "Vitamin Water",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Execute Box 51"): {
        "location": "Cooler",
        "location_guidance": "Forecourt; cold vault; pizza warmer",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 11"): {
        "location": "Cooler",
        "location_guidance": "Cold Vault",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 12"): {
        "skus_stated": "Coke; Coke Zero; Sprite; Smartwater; Core Power",
    },
    ("P-004830_CIRCLE K GREAT LAKES CCNA_7-1-9-1.pdf", "Sell Sheet 13"): {
        "pack_size_status": "Inferred",
        "pack_sizes_stated": "Mini Can",
        "location_guidance": "Entryway Cooler",
    },
}

DATE_RE = re.compile(r"\b\d{1,2}/\d{1,2}\s*-\s*\d{1,2}/\d{1,2}\b")
BOX_PREFIX_RE = re.compile(
    r"^(?:OnAd\s*)?(?:Late Break\s*)?(?:Sell Sheet|Sell Box|Execute Box|Sheet|OnAd)\s*\d+\s*",
    flags=re.I,
)


def js(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def clean(value: str | None) -> str:
    return (value or "").strip()


def normalize_text(value: str) -> str:
    value = (
        value.replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def strip_percent_badges(value: str) -> str:
    value = re.sub(r"(?<![\d.])\d{1,3}\s*%", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def strip_box_prefix(value: str) -> str:
    value = BOX_PREFIX_RE.sub("", value)
    value = re.sub(r"^Late Break\s*\d+\s*", "", value, flags=re.I)
    return value.strip()


def infer_pack_sizes(row: dict[str, str]) -> str:
    stated = clean(row.get("pack_sizes_stated"))
    if stated and stated != "Not explicitly stated":
        return stated

    text = normalize_text(" ".join([
        row.get("activity", ""),
        row.get("execution_detail", ""),
        row.get("raw_text", ""),
    ]))
    low = text.lower()
    packs: list[str] = []

    if re.search(r"\b12\s*(?:pk|pks|pack|packs)\b", low):
        packs.extend(["12oz", "12pk"])
    if re.search(r"\b24\s*(?:pk|pks|pack|packs)\b", low):
        packs.extend(["12oz", "24pk"])
    if re.search(r"\b10\s*(?:pk|pks|pack|packs)\b", low):
        packs.append("10pk")
    if re.search(r"\b6\s*(?:pk|pks|pack|packs)\b", low):
        packs.append("6pk")
    if re.search(r"\b2\s*l(?:tr)?\b|\b2l\b", low):
        packs.append("2L")
    if re.search(r"\b20\s*oz\b", low):
        packs.append("20oz")
    if re.search(r"\b7\.5\s*oz\b", low):
        packs.append("7.5oz")

    return "; ".join(dict.fromkeys(packs)) if packs else stated or "Not explicitly stated"


def clean_activity_title(raw: str, fallback: str) -> str:
    text = strip_box_prefix(strip_percent_badges(normalize_text(raw)))
    date_match = DATE_RE.search(text)
    title = text[: date_match.start()].strip() if date_match else text
    title = re.split(r"\s+Included in Display Planner\b", title, maxsplit=1, flags=re.I)[0]
    title = re.split(r"\s+Customer HQ Support Letter\b", title, maxsplit=1, flags=re.I)[0]
    title = re.sub(r"\s+", " ", title).strip(" -:")
    return title or strip_percent_badges(fallback)


def extract_active_dates(raw: str, fallback: str) -> str:
    match = DATE_RE.search(normalize_text(raw))
    return match.group(0).replace(" ", "") .replace("-", " - ") if match else fallback


def clean_execution_detail(raw: str, fallback: str) -> str:
    text = strip_percent_badges(strip_box_prefix(normalize_text(raw)))
    date_match = DATE_RE.search(text)
    if date_match:
        detail = text[date_match.end() :].strip()
    else:
        detail = fallback

    detail = re.sub(r"^(?:\$\d+(?:\.\d{2})?|(?:\d+/\$?\d+(?:\.\d{2})?))(?:MB\d*)?\s*", "", detail, flags=re.I)
    detail = re.sub(r"^\$\d+(?:\.\d{2})?\s*", "", detail)
    detail = re.sub(r"^\d+/\$\d+(?:\.\d{2})?MB\d*\s*", "", detail, flags=re.I)
    detail = re.sub(r"^\d+/\d+(?:\.\d{2})?MB\d*\s*", "", detail, flags=re.I)
    detail = re.sub(r"\s+", " ", detail).strip(" -:")
    return detail or strip_percent_badges(fallback)


def safe_id(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def fnum(row: dict[str, str], key: str) -> float:
    try:
        return float(row.get(key) or 0)
    except Exception:
        return 0.0


def location_from_subloc(value: str) -> str:
    value = clean(value)
    if "___" in value:
        value = value.split("___", 1)[1]
    return value.replace("_", " ").strip() or "Not stated"


def location_category(location: str) -> str:
    low = location.lower()
    if "checkout" in low or "queue" in low:
        return "Front End / Checkout"
    if "lobby" in low or "entrance" in low:
        return "Lobby / Entrance"
    if "aisle" in low:
        return "Aisle"
    if "end cap" in low or "endcap" in low:
        return "Endcap"
    if "perimeter" in low:
        return "Perimeter"
    if "cooler" in low or "cold vault" in low:
        return "Cooler"
    if "produce" in low or "deli" in low or "bakery" in low or "meat" in low:
        return "Department"
    return "Display area"


def store_meta(csv_rows: list[dict[str, str]], customer: str) -> dict[str, str]:
    row = csv_rows[0]
    name = clean(row["ko_outlet_name"])
    address = f"{clean(row['address'])}, {clean(row['city'])}, AZ {clean(row['zip_code'])}"
    key = clean(row["dim_outlet_key"])
    if "WALMART" in name.upper():
        retailer = "Walmart"
        segment = "Mass / Large Format"
        phone = "(555) 518-9000"
    elif "FAMILY DOLLAR" in name.upper():
        retailer = "Family Dollar"
        segment = "Value / Dollar"
        phone = "(555) 117-9600"
    elif "CIRCLE K" in name.upper():
        retailer = "Circle K"
        segment = "Convenience / Petroleum"
        phone = "(555) 270-8833"
    else:
        retailer = customer.title()
        segment = clean(row["harmonized_channel"]) or "Retail"
        phone = "(555) 010-0000"
    return {
        "id": safe_id(name),
        "distributor": "Arizona CSV Model",
        "retailer": retailer,
        "storeName": name.title().replace("  ", " "),
        "segment": segment,
        "address": address,
        "routeId": key,
        "phone": phone,
    }


def tokenize(value: str | None) -> set[str]:
    return {tok for tok in re.findall(r"[A-Z0-9]+", (value or "").upper()) if len(tok) > 1}


def pack_tokens(value: str | None) -> set[str]:
    return set(re.findall(r"\b\d+(?:\.\d+)?\s?(?:OZ|L|LTR|ML|PK|PACK|CT)\b", (value or "").upper()))


def package_pack_size(package: str) -> str:
    vals = re.findall(r"\b\d+(?:\.\d+)?\s?(?:OZ|L|ML|PK|PACK|CT)\b", (package or "").upper())
    return "; ".join(dict.fromkeys(vals)) if vals else package


def brand_key(value: str) -> str:
    text = (value or "").upper()
    if "SPICED" in text:
        return "coca-cola-spiced"
    if "ORANGE CREAM" in text:
        return "coca-cola-orange-cream"
    if "HOLIDAY CREAMY VANILLA" in text or "CREAMY VANILLA" in text:
        return "coca-cola-creamy-vanilla"
    if "DIET COKE" in text:
        return "diet-coke"
    if "CHERRY COKE" in text:
        return "cherry-coke"
    if "COKE ZERO" in text or "ZERO SUGAR" in text:
        return "coke-zero"
    if "COCA-COLA" in text or re.search(r"\bCOKE\b", text):
        return "coke"
    if "DIET SPRITE ZERO" in text:
        return "diet-sprite-zero"
    if "SPRITE + TEA" in text:
        return "sprite-tea"
    if "SPRITE CHILL" in text:
        return "sprite-chill"
    if "SPRITE WINTER" in text:
        return "sprite-winter-spiced"
    if "SPRITE ZERO" in text:
        return "sprite-zero"
    if "SPRITE" in text:
        return "sprite"
    if "FANTA" in text:
        return "fanta"
    if "POWERADE" in text:
        return "powerade"
    if "BODYARMOR" in text or "BODY ARMOR" in text:
        return "bodyarmor"
    if "SMARTWATER" in text or "SMART WATER" in text:
        return "smartwater"
    if "DASANI" in text:
        return "dasani"
    if "TOPO CHICO" in text:
        return "topo-chico"
    if "VITAMIN WATER" in text:
        return "vitamin-water"
    if "GOLD PEAK" in text:
        return "gold-peak"
    if "CORE POWER" in text:
        return "core-power"
    if "FAIRLIFE" in text:
        return "fairlife"
    if "MONSTER" in text:
        return "monster"
    if "DR PEPPER" in text:
        return "dr-pepper"
    return safe_id(text)


def pack_keys(value: str | None) -> set[str]:
    packs = re.findall(r"\b\d+(?:\.\d+)?\s*(?:OZ|L|LTR|ML|PK|PACK|CT)\b", (value or "").upper())
    keys = {canonical_pack_token(pack) for pack in packs}
    if re.search(r"\bmini\s*can", (value or ""), flags=re.I):
        keys.add("mini-can")
    return keys


def canonical_pack_token(value: str) -> str:
    token = value.strip().lower().replace(" ", "").replace("pack", "pk").replace("pks", "pk")
    equivalents = {
        "67.6oz": "2l",
        "2ltr": "2l",
        "42.2oz": "1.25l",
        "33.8oz": "1l",
        "16.9oz": "500ml",
        "5l": "500ml",
        "0.5l": "500ml",
        ".5l": "500ml",
    }
    return equivalents.get(token, token)


def backend_sku_constraints(activity: dict[str, str]) -> list[tuple[str, set[str]]]:
    skus = clean(activity.get("skus_stated"))
    packs = pack_keys(activity.get("pack_sizes_stated"))
    if not skus or skus == "Not explicitly stated":
        return []
    return [(brand_key(sku), packs) for sku in skus.split(";") if clean(sku)]


def row_matches_backend_sku(activity: dict[str, str], row: dict[str, str]) -> bool:
    constraints = backend_sku_constraints(activity)
    if not constraints:
        return False
    row_brand = brand_key(clean(row.get("harmonized_brand")))
    row_packs = pack_keys(row.get("harmonized_package"))
    return any(row_brand == brand and packs.issubset(row_packs) for brand, packs in constraints)


def candidate_from_row(row: dict[str, str], idx: int, match_score: float) -> dict[str, object]:
    current = fnum(row, "predicted_current")
    ideal = fnum(row, "predicted_ideal")
    opp = fnum(row, "opportunity_units")
    pct = ((ideal - current) / current * 100.0) if current else 0.0
    brand = clean(row["harmonized_brand"]) or "Unknown Brand"
    package = clean(row["harmonized_package"]) or "Unknown Package"
    sku = f"{brand} {package}".strip()
    display_type = clean(row["placement"]) or "Display"
    loc_guidance = location_from_subloc(row["sim_subloc"])
    facings = int(round(fnum(row, "sim_facings"))) or 1
    try:
        rank = int(float(clean(row["rank"]) or idx))
    except Exception:
        rank = idx
    return {
        "id": f"csv-{idx}-{safe_id(sku)}-{safe_id(loc_guidance)}",
        "sku": sku,
        "packSize": package_pack_size(package),
        "displayType": display_type,
        "location": location_category(loc_guidance),
        "locationGuidance": loc_guidance,
        "facings": facings,
        "predictedCurrent": round(current, 1),
        "predictedIdeal": round(ideal, 1),
        "opportunityUnits": round(opp, 1),
        "liftPct": round(pct, 1),
        "rank": rank,
        "matchScore": match_score,
        "isTypeValid": clean(row["is_type_valid"]) == "1",
        "sublocTier": clean(row["subloc_tier"]),
        "sourceFile": CSV_PATH.name,
    }


def score_candidate(activity: dict[str, str], row: dict[str, str]) -> float:
    score = 0.0
    act_display = clean(activity["display_type"]).lower()
    row_display = clean(row["placement"]).lower()
    if act_display and act_display == row_display:
        score += 1000
    elif act_display == "display" and row_display in {"display", "shipper"}:
        score += 600

    act_loc_text = f"{activity.get('location','')} {activity.get('location_guidance','')} {activity.get('activity','')}"
    row_loc = location_from_subloc(row["sim_subloc"])
    score += 80 * len(tokenize(act_loc_text) & tokenize(row_loc))
    if clean(activity.get("location")) != "Not stated" and location_category(clean(activity.get("location_guidance")) or clean(activity.get("location"))) == location_category(row_loc):
        score += 240

    noisy = {"SELL", "SHEET", "EXECUTE", "DISPLAY", "CUSTOMER", "SUPPORT", "LETTER", "ROLLBACK", "PRICE", "NEW", "ITEM"}
    overlap = (tokenize(activity.get("skus_stated")) | tokenize(activity.get("activity")) - noisy) & (
        tokenize(f"{row.get('harmonized_brand','')} {row.get('harmonized_package','')}") - noisy
    )
    score += 120 * len(overlap)
    score += 180 * len((pack_tokens(activity.get("pack_sizes_stated")) | pack_tokens(activity.get("activity"))) & pack_tokens(row.get("harmonized_package")))
    if clean(row.get("is_type_valid")) == "1":
        score += 20
    return score


def main() -> None:
    pdf_rows = json.loads(PDF_JSON.read_text(encoding="utf-8"))
    for row in pdf_rows:
        raw = row.get("raw_text") or row.get("execution_detail") or row["activity"]
        row["activity"] = clean_activity_title(raw, row["activity"])
        row["window"] = extract_active_dates(raw, row.get("window", "Not stated"))
        row["execution_detail"] = clean_execution_detail(raw, row.get("execution_detail", ""))
        row["pack_sizes_stated"] = infer_pack_sizes(row)
        if row["pack_sizes_stated"] != "Not explicitly stated" and row.get("pack_size_status") != "Explicit":
            row["pack_size_status"] = "Inferred"
        override = LLM_ACTIVITY_OVERRIDES.get((row["source_file"], row["box"]))
        if override:
            row.update(override)

    PDF_JSON.write_text(json.dumps(pdf_rows, indent=2, ensure_ascii=False), encoding="utf-8")

    csv_rows: list[dict[str, str]] = []
    with CSV_PATH.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            current = fnum(row, "predicted_current")
            ideal = fnum(row, "predicted_ideal")
            row["_opp"] = fnum(row, "opportunity_units")  # type: ignore[index]
            row["_pct"] = ((ideal - current) / current * 100.0) if current else 0.0  # type: ignore[index]
            csv_rows.append(row)

    csv_by_name: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in csv_rows:
        csv_by_name[clean(row["ko_outlet_name"])].append(row)

    pdf_by_customer: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in pdf_rows:
        pdf_by_customer[row["customer"]].append(row)

    lines = ['import { IMAGES, StoreInfo } from "../types";', "", "export const PICOS_STORES: StoreInfo[] = ["]
    for customer, activities in pdf_by_customer.items():
        csv_name = CUSTOMER_MAP[customer]
        store_csv = csv_by_name[csv_name]
        meta = store_meta(store_csv, customer)
        lines.append("  {")
        for key in ["id", "distributor", "retailer", "storeName", "segment", "address", "routeId"]:
            lines.append(f"    {key}: {js(meta[key])},")
        lines.append("    manager: {")
        lines.append('      name: "Store Manager",')
        lines.append("      avatar: IMAGES.storeManager,")
        lines.append(f"      phone: {js(meta['phone'])}")
        lines.append("    },")
        lines.append("    picosBoxes: [")
        for activity in activities:
            scored = []
            for row_index, csv_row in enumerate(store_csv):
                score = score_candidate(activity, csv_row)
                scored.append((score, float(csv_row["_opp"]), float(csv_row["_pct"]), row_index, csv_row))  # type: ignore[arg-type]
            ranked_general = sorted(scored, key=lambda item: (item[0], item[1], item[2]), reverse=True)[:TOP_CANDIDATES]
            ranked_explicit = [
                item for item in sorted(scored, key=lambda item: (item[0], item[1], item[2]), reverse=True)
                if row_matches_backend_sku(activity, item[4])
            ][:EXPLICIT_SKU_CANDIDATES]
            ranked = []
            seen_rows: set[int] = set()
            for item in [*ranked_general, *ranked_explicit]:
                row_index = item[3]
                if row_index in seen_rows:
                    continue
                ranked.append(item)
                seen_rows.add(row_index)
            candidates = [candidate_from_row(csv_row, row_index + 1, score) for score, _opp, _pct, row_index, csv_row in ranked]

            lines.append("      {")
            mapping = [
                ("box", "box"), ("coreBox", "core_box"), ("mode", "mode"), ("activity", "activity"), ("onAd", "on_ad"),
                ("confidencePct", "confidence_pct"), ("support", "support"), ("window", "window"), ("displayType", "display_type"),
                ("location", "location"), ("locationGuidance", "location_guidance"), ("packSizeStatus", "pack_size_status"),
                ("packSizesStated", "pack_sizes_stated"), ("skuStatus", "sku_status"), ("skusStated", "skus_stated"),
                ("executionDetail", "execution_detail"), ("verificationScale", "verification_scale"), ("sourcePages", "source_pages"),
                ("sourceImage", "source_image"), ("optimizationNote", "optimization_note"), ("sourceFile", "source_file"),
            ]
            for out_key, in_key in mapping:
                value = activity.get(in_key, "")
                if isinstance(value, int):
                    lines.append(f"        {out_key}: {value},")
                else:
                    lines.append(f"        {out_key}: {js(str(value))},")
            lines.append("        optimizationCandidates: [")
            for cand in candidates:
                lines.append("          {")
                for key, value in cand.items():
                    if isinstance(value, bool):
                        lines.append(f"            {key}: {str(value).lower()},")
                    elif isinstance(value, (int, float)):
                        lines.append(f"            {key}: {value},")
                    else:
                        lines.append(f"            {key}: {js(str(value))},")
                lines.append("          },")
            lines.append("        ],")
            lines.append("      },")
        lines.append("    ]")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export const DEFAULT_STORE = PICOS_STORES[0];")
    OUT_TS.write_text("\n".join(lines), encoding="utf-8")

    bad_titles = [row["activity"] for row in pdf_rows if re.search(r"(?<![\d.])\d{1,3}\s*%", row["activity"])]
    print(f"Updated {PDF_JSON} and {OUT_TS}")
    print(f"Activities: {len(pdf_rows)}; percent badges in titles: {len(bad_titles)}")


if __name__ == "__main__":
    main()
