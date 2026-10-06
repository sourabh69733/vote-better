"""Build unreviewed PIN-to-parliamentary-area candidates from sourced GeoJSON polygons."""

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from shapely import make_valid
from shapely.geometry import shape
from shapely.ops import unary_union
from shapely.strtree import STRtree


def _source_record(path: Path, metadata: dict) -> dict:
    if not isinstance(metadata, dict):
        raise ValueError("each source needs metadata")
    url = metadata.get("url")
    checked_at = metadata.get("checkedAt")
    if not isinstance(url, str) or urlparse(url).scheme != "https" or not urlparse(url).netloc:
        raise ValueError("source URL must be HTTPS")
    if not isinstance(checked_at, str) or date.fromisoformat(checked_at).isoformat() != checked_at:
        raise ValueError("checkedAt must be an ISO date")
    with path.open("rb") as stream:
        digest = "sha256:" + hashlib.file_digest(stream, "sha256").hexdigest()
    if metadata.get("inputSha256") is not None and metadata["inputSha256"] != digest:
        raise ValueError(f"source hash mismatch: {path}")
    record = {"url": url, "checkedAt": checked_at, "inputSha256": digest}
    upstream_url = metadata.get("upstreamUrl")
    if upstream_url is not None:
        if not isinstance(upstream_url, str) or urlparse(upstream_url).scheme != "https" or not urlparse(upstream_url).netloc:
            raise ValueError("upstreamUrl must be HTTPS")
        record["upstreamUrl"] = upstream_url
    return record


def _geojsonl_features(path: Path):
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                yield json.loads(line)


def _polygons(path: Path, field: str, kind: str) -> dict:
    if path.suffix == ".geojsonl":
        features = _geojsonl_features(path)
    else:
        document = json.loads(path.read_text(encoding="utf-8"))
        if document.get("type") != "FeatureCollection" or not isinstance(document.get("features"), list):
            raise ValueError(f"{kind} must be a GeoJSON FeatureCollection")
        crs = document.get("crs")
        if crs is not None and crs != {"type": "name", "properties": {"name": "EPSG:4326"}}:
            raise ValueError(f"{kind} must use WGS84 longitude/latitude coordinates")
        features = document["features"]
    groups = defaultdict(list)
    repaired = set()
    for index, feature in enumerate(features):
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise ValueError(f"invalid {kind} feature {index}")
        properties = feature.get("properties")
        key = properties.get(field) if isinstance(properties, dict) else None
        if kind == "pins":
            if not isinstance(key, str) or len(key) != 6 or not key.isascii() or not key.isdigit():
                raise ValueError(f"invalid PIN at feature {index}")
        elif isinstance(key, int) and not isinstance(key, bool):
            key = str(key)
        elif not isinstance(key, str) or not key.strip():
            raise ValueError(f"missing area ID at feature {index}")
        geometry = shape(feature.get("geometry"))
        if geometry.geom_type not in ("Polygon", "MultiPolygon") or geometry.is_empty:
            raise ValueError(f"invalid {kind} polygon at feature {index}")
        west, south, east, north = geometry.bounds
        if west < -180 or east > 180 or south < -90 or north > 90:
            raise ValueError(f"{kind} feature {index} does not use longitude/latitude coordinates")
        if not geometry.is_valid:
            geometry = make_valid(geometry)
            if geometry.geom_type == "GeometryCollection":
                geometry = unary_union([part for part in geometry.geoms if part.geom_type in ("Polygon", "MultiPolygon")])
            if geometry.geom_type not in ("Polygon", "MultiPolygon") or geometry.is_empty or not geometry.is_valid or geometry.area <= 0:
                raise ValueError(f"unrepairable {kind} polygon at feature {index}")
            repaired.add(key)
        if geometry.area <= 0:
            raise ValueError(f"invalid {kind} polygon at feature {index}")
        groups[key].append(geometry)
    if not groups:
        raise ValueError(f"{kind} has no polygons")
    combined = {key: unary_union(parts) for key, parts in groups.items()}
    if any(not geometry.is_valid for geometry in combined.values()):
        raise ValueError(f"{kind} contains an invalid combined polygon")
    return combined, repaired


def build_pin_lookup(pin_geojson, pc_geojson, output_file, sources, pin_field="pin_code", area_field="area_id"):
    """Return candidate constituency IDs for each PIN; never claim a voter match."""
    pin_path, pc_path, output_path = map(Path, (pin_geojson, pc_geojson, output_file))
    if not isinstance(sources, dict) or "pins" not in sources or "areas" not in sources:
        raise ValueError("both source records are required")
    provenance = {
        "pins": _source_record(pin_path, sources["pins"]),
        "areas": _source_record(pc_path, sources["areas"]),
    }
    pins, repaired_pins = _polygons(pin_path, pin_field, "pins")
    areas, repaired_areas = _polygons(pc_path, area_field, "areas")
    area_ids = sorted(areas)
    area_shapes = [areas[area_id] for area_id in area_ids]
    tree = STRtree(area_shapes)
    matches = {}
    for pin, pin_shape in sorted(pins.items()):
        possible = sorted(area_ids[int(index)] for index in tree.query(pin_shape)
                          if pin_shape.intersection(area_shapes[int(index)]).area > 0)
        matches[pin] = {
            "status": "no-match" if not possible else "single-possible" if len(possible) == 1 else "multiple-possible",
            "possibleAreaIds": possible,
        }
        if pin in repaired_pins or any(area_id in repaired_areas for area_id in possible):
            matches[pin]["geometryReviewRequired"] = True
    result = {
        "schemaVersion": 1,
        "reviewStatus": "unreviewed",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "sources": provenance,
        "pinCount": len(pins),
        "areaCount": len(areas),
        "repairedPinCodes": sorted(repaired_pins),
        "repairedAreaIds": sorted(repaired_areas),
        "pins": matches,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output_path)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pins", required=True, type=Path, help="Department of Posts PIN boundary GeoJSON")
    parser.add_argument("--areas", required=True, type=Path, help="Parliamentary constituency boundary GeoJSON")
    parser.add_argument("--sources", required=True, type=Path, help="JSON with pins/areas URL and checkedAt")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--pin-field", default="pin_code")
    parser.add_argument("--area-field", default="area_id")
    args = parser.parse_args()
    sources = json.loads(args.sources.read_text(encoding="utf-8"))
    result = build_pin_lookup(args.pins, args.areas, args.output, sources, args.pin_field, args.area_field)
    counts = {status: sum(value["status"] == status for value in result["pins"].values())
              for status in ("single-possible", "multiple-possible", "no-match")}
    print(json.dumps({"pinCount": result["pinCount"], "areaCount": result["areaCount"], **counts}))


if __name__ == "__main__":
    main()
