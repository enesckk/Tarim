#!/usr/bin/env python3
"""
TKGM parsel sorgulama ve GeoJSON arşivleme aracı.

Kullanım (etkileşimli):
    python scripts/tkgm_geojson_ekle.py

Kullanım (CLI / CI):
    python scripts/tkgm_geojson_ekle.py \\
      --province Gaziantep --district Şehitkamil --neighborhood Güngürge \\
      --block 108 --parcel 7 \\
      --output storage/tkgm/parseller.geojson \\
      --single-feature-file storage/tkgm/gungurge-108-7.geojson

Yalnızca Python standart kütüphanesi.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API_BASE = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api"
IL_LIST_URL = (
    "https://parselsorgu.tkgm.gov.tr/"
    "app/modules/administrativeQuery/data/ilListe.json"
)
OUTPUT_FILE = Path("parseller.geojson")
TIMEOUT_SECONDS = 30

HEADERS = {
    "Accept": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36"
    ),
}


def normalize_text(value: str) -> str:
    value = value.strip().casefold()
    replacements = {
        "ı": "i", "ş": "s", "ğ": "g",
        "ü": "u", "ö": "o", "ç": "c",
    }
    value = "".join(replacements.get(ch, ch) for ch in value)
    value = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in value if not unicodedata.combining(ch))


def http_get_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"TKGM servisi HTTP {exc.code} hatası verdi: {detail[:300]}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"TKGM servisine bağlanılamadı: {exc.reason}") from exc

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("TKGM servisi geçerli JSON döndürmedi.") from exc

    if isinstance(data, dict):
        message = data.get("Message") or data.get("message")
        if message:
            raise RuntimeError(str(message))
        return data

    raise RuntimeError("TKGM servisinden beklenmeyen yanıt geldi.")


def parse_features(data: dict[str, Any]) -> list[dict[str, Any]]:
    if data.get("type") == "FeatureCollection":
        return list(data.get("features") or [])
    return []


def find_item_by_name(
    features: list[dict[str, Any]],
    wanted_name: str,
    id_keys: tuple[str, ...] = ("id",),
    name_keys: tuple[str, ...] = ("text", "ad", "name"),
) -> tuple[Any, str]:
    wanted = normalize_text(wanted_name)
    candidates: list[tuple[Any, str]] = []

    for feature in features:
        props = feature.get("properties") or {}

        item_name = ""
        for key in name_keys:
            if props.get(key):
                item_name = str(props[key]).strip()
                break

        item_id = None
        for key in id_keys:
            if props.get(key) is not None:
                item_id = props[key]
                break

        if item_id is not None and item_name:
            candidates.append((item_id, item_name))

    exact = [item for item in candidates if normalize_text(item[1]) == wanted]
    if len(exact) == 1:
        return exact[0]

    partial = [
        item for item in candidates
        if wanted in normalize_text(item[1])
        or normalize_text(item[1]) in wanted
    ]
    if len(partial) == 1:
        return partial[0]

    available = ", ".join(name for _, name in candidates[:25])
    if len(exact) > 1 or len(partial) > 1:
        raise RuntimeError(f"'{wanted_name}' için birden fazla eşleşme bulundu.")

    raise RuntimeError(
        f"'{wanted_name}' bulunamadı. Örnek kayıtlar: {available}"
    )


def get_province_id(province_name: str) -> tuple[Any, str]:
    data = http_get_json(IL_LIST_URL)
    return find_item_by_name(parse_features(data), province_name)


def get_district_id(province_id: Any, district_name: str) -> tuple[Any, str]:
    url = f"{API_BASE}/idariYapi/ilceListe/{province_id}"
    data = http_get_json(url)
    return find_item_by_name(
        parse_features(data), district_name,
        id_keys=("id", "ilceKodu"),
        name_keys=("text", "ilceAdi", "ad", "name"),
    )


def get_neighborhood_id(district_id: Any, neighborhood_name: str) -> tuple[Any, str]:
    url = f"{API_BASE}/idariYapi/mahalleListe/{district_id}"
    data = http_get_json(url)
    return find_item_by_name(
        parse_features(data), neighborhood_name,
        id_keys=("id", "mahalleKodu"),
        name_keys=("text", "mahalleAdi", "ad", "name"),
    )


def get_parcel(neighborhood_id: Any, block_no: str, parcel_no: str) -> dict[str, Any]:
    api_block_no = block_no.strip() or "0"

    encoded_neighborhood = urllib.parse.quote(str(neighborhood_id), safe="")
    encoded_block = urllib.parse.quote(api_block_no, safe="")
    encoded_parcel = urllib.parse.quote(parcel_no.strip(), safe="")

    url = (
        f"{API_BASE}/parsel/"
        f"{encoded_neighborhood}/{encoded_block}/{encoded_parcel}"
    )
    data = http_get_json(url)

    if data.get("type") != "Feature":
        raise RuntimeError("Parsel bulunamadı veya TKGM beklenmeyen veri döndürdü.")
    if not data.get("geometry"):
        raise RuntimeError("Parsel kaydında geometri bulunamadı.")
    return data


def load_collection(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"type": "FeatureCollection", "features": []}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"{path} okunamadı veya geçerli GeoJSON değil.") from exc

    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise RuntimeError(f"{path} bir GeoJSON FeatureCollection olmalıdır.")
    return data


def parcel_key(feature: dict[str, Any]) -> tuple[str, str, str, str, str]:
    props = feature.get("properties") or {}
    return (
        normalize_text(str(props.get("ilAd") or "")),
        normalize_text(str(props.get("ilceAd") or "")),
        normalize_text(str(props.get("mahalleAd") or "")),
        str(props.get("adaNo") or "").strip(),
        str(props.get("parselNo") or "").strip(),
    )


def save_feature(feature: dict[str, Any], output_path: Path) -> str:
    collection = load_collection(output_path)
    features = collection["features"]
    new_key = parcel_key(feature)

    existing_index = next(
        (i for i, current in enumerate(features) if parcel_key(current) == new_key),
        None,
    )

    if existing_index is not None:
        features[existing_index] = feature
        action = "güncellendi"
    else:
        features.append(feature)
        action = "eklendi"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(collection, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return action


def write_single_feature_collection(feature: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": [feature]},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def required_input(label: str) -> str:
    while True:
        value = input(label).strip()
        if value:
            return value
        print("Bu alan boş bırakılamaz.")


def fetch_parcel_feature(
    province: str,
    district: str,
    neighborhood: str,
    block: str,
    parcel: str,
) -> tuple[dict[str, Any], str, str, str]:
    province_id, matched_province = get_province_id(province)
    district_id, matched_district = get_district_id(province_id, district)
    neighborhood_id, matched_neighborhood = get_neighborhood_id(
        district_id, neighborhood
    )
    feature = get_parcel(neighborhood_id, block, parcel)
    return feature, matched_province, matched_district, matched_neighborhood


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TKGM parsel → GeoJSON")
    parser.add_argument("--province")
    parser.add_argument("--district")
    parser.add_argument("--neighborhood")
    parser.add_argument("--block", default="")
    parser.add_argument("--parcel")
    parser.add_argument("--output", default=str(OUTPUT_FILE))
    parser.add_argument(
        "--single-feature-file",
        help="Tek parsel FeatureCollection dosyası (verified import için)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Özet sonucu JSON olarak stdout'a yaz",
    )
    return parser.parse_args(argv)


def run_cli(args: argparse.Namespace) -> int:
    interactive = not all([args.province, args.district, args.neighborhood, args.parcel])

    if interactive:
        print("TKGM parsel GeoJSON ekleme aracı")
        print("-" * 36)
        province = required_input("İl: ")
        district = required_input("İlçe: ")
        neighborhood = required_input("Mahalle/Köy: ")
        block = input("Ada no (yoksa boş bırakın): ").strip()
        parcel = required_input("Parsel no: ")
        output_name = input(f"Çıktı dosyası [{OUTPUT_FILE.name}]: ").strip()
        output_path = Path(output_name) if output_name else OUTPUT_FILE
        single_file = Path(args.single_feature_file) if args.single_feature_file else None
    else:
        province = args.province
        district = args.district
        neighborhood = args.neighborhood
        block = args.block or ""
        parcel = args.parcel
        output_path = Path(args.output)
        single_file = Path(args.single_feature_file) if args.single_feature_file else None

    try:
        feature, matched_province, matched_district, matched_neighborhood = fetch_parcel_feature(
            province, district, neighborhood, block, parcel
        )
        action = save_feature(feature, output_path)
        if single_file is not None:
            write_single_feature_collection(feature, single_file)

        props = feature.get("properties") or {}
        summary = {
            "status": "OK",
            "action": action,
            "output": str(output_path.resolve()),
            "singleFeatureFile": str(single_file.resolve()) if single_file else None,
            "match": f"{matched_province} / {matched_district} / {matched_neighborhood}",
            "parcel": {
                "province": props.get("ilAd", matched_province),
                "district": props.get("ilceAd", matched_district),
                "neighborhood": props.get("mahalleAd", matched_neighborhood),
                "block": str(props.get("adaNo") or block or ""),
                "parcel": str(props.get("parselNo") or parcel),
                "area": props.get("alan"),
                "landType": props.get("nitelik"),
            },
        }

        if args.json:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        else:
            print(
                "Eşleşme: "
                f"{matched_province} / {matched_district} / {matched_neighborhood}"
            )
            print("\nİşlem tamamlandı.")
            print(f"Dosya: {output_path.resolve()}")
            if single_file:
                print(f"Tek parsel: {single_file.resolve()}")
            print(f"Durum: {action}")
            print(
                "Parsel: "
                f"{props.get('mahalleAd', matched_neighborhood)} / "
                f"{props.get('adaNo') or '-'} / "
                f"{props.get('parselNo', parcel)}"
            )
            print(f"Alan: {props.get('alan', 'Bilinmiyor')} m²")
            print(f"Nitelik: {props.get('nitelik', 'Bilinmiyor')}")
        return 0

    except (RuntimeError, OSError) as exc:
        if args.json:
            print(json.dumps({"status": "FAILED", "message": str(exc)}, ensure_ascii=False))
        else:
            print(f"\nHata: {exc}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    return run_cli(parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
