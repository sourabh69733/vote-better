import json
import tempfile
import unittest
from pathlib import Path

from data.src.geo.build_pin_lookup import build_pin_lookup


def polygon(left, bottom, right, top):
    return {"type": "Polygon", "coordinates": [[
        [left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]
    ]]}


def collection(features):
    return {"type": "FeatureCollection", "features": features}


def feature(field, value, geometry):
    return {"type": "Feature", "properties": {field: value}, "geometry": geometry}


class PinLookupTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.pins = self.root / "pins.geojson"
        self.areas = self.root / "areas.geojson"
        self.output = self.root / "lookup.json"
        self.sources = {
            "pins": {"url": "https://data.gov.in/catalog/all-india-pincode-boundary-geo-json", "checkedAt": "2026-10-06"},
            "areas": {"url": "https://example.gov.in/constituencies", "checkedAt": "2026-10-06"},
        }

    def write(self, pins, areas):
        self.pins.write_text(json.dumps(collection(pins)))
        self.areas.write_text(json.dumps(collection(areas)))

    def run_build(self):
        return build_pin_lookup(self.pins, self.areas, self.output, self.sources)

    def test_pin_crossing_two_constituencies_returns_both(self):
        self.write([feature("pin_code", "302001", polygon(1, 1, 3, 3))], [
            feature("area_id", "jaipur", polygon(0, 0, 2, 4)),
            feature("area_id", "jaipur-rural", polygon(2, 0, 4, 4)),
        ])
        result = self.run_build()
        self.assertEqual(result["pins"]["302001"], {
            "status": "multiple-possible", "possibleAreaIds": ["jaipur", "jaipur-rural"]
        })
        self.assertEqual(result["reviewStatus"], "unreviewed")
        self.assertEqual(len(result["sources"]["pins"]["inputSha256"]), 71)
        self.assertEqual(json.loads(self.output.read_text()), result)

    def test_boundary_touch_alone_is_not_a_match(self):
        self.write([feature("pin_code", "302002", polygon(0, 0, 1, 1))], [
            feature("area_id", "one", polygon(1, 0, 2, 1)),
        ])
        self.assertEqual(self.run_build()["pins"]["302002"]["status"], "no-match")

    def test_duplicate_pin_features_are_combined_and_missing_area_is_explicit(self):
        self.write([
            feature("pin_code", "302003", polygon(0, 0, 1, 1)),
            feature("pin_code", "302003", polygon(3, 0, 4, 1)),
            feature("pin_code", "302004", polygon(6, 0, 7, 1)),
        ], [
            feature("area_id", "one", polygon(0, 0, 2, 2)),
            feature("area_id", "two", polygon(2, 0, 5, 2)),
        ])
        result = self.run_build()
        self.assertEqual(result["pins"]["302003"]["possibleAreaIds"], ["one", "two"])
        self.assertEqual(result["pins"]["302004"], {"status": "no-match", "possibleAreaIds": []})

    def test_invalid_geometry_fails_without_writing_output(self):
        self.write([feature("pin_code", "302005", polygon(0, 0, 0, 1))], [
            feature("area_id", "one", polygon(0, 0, 2, 2)),
        ])
        with self.assertRaises(ValueError):
            self.run_build()
        self.assertFalse(self.output.exists())

    def test_geojson_lines_and_numeric_area_ids(self):
        self.pins = self.root / "pins.geojsonl"
        self.areas = self.root / "areas.geojsonl"
        self.pins.write_text(json.dumps(feature("Pincode", "302006", polygon(0, 0, 1, 1))) + "\n")
        self.areas.write_text(json.dumps(feature("pc_id", 807, polygon(0, 0, 2, 2))) + "\n")
        result = build_pin_lookup(self.pins, self.areas, self.output, self.sources,
                                  pin_field="Pincode", area_field="pc_id")
        self.assertEqual(result["pins"]["302006"]["possibleAreaIds"], ["807"])

    def test_repaired_self_intersection_is_marked_for_review(self):
        bowtie = {"type": "Polygon", "coordinates": [[
            [0, 0], [2, 2], [0, 2], [2, 0], [0, 0]
        ]]}
        self.write([feature("pin_code", "302007", polygon(0, 0, 1, 1))], [
            feature("area_id", "repaired", bowtie),
        ])
        result = self.run_build()
        self.assertEqual(result["repairedAreaIds"], ["repaired"])
        self.assertEqual(result["pins"]["302007"]["geometryReviewRequired"], True)

    def test_projected_coordinates_and_hash_mismatch_fail_closed(self):
        self.write([feature("pin_code", "302008", polygon(8000000, 3000000, 8000100, 3000100))], [
            feature("area_id", "one", polygon(8000000, 3000000, 8000200, 3000200)),
        ])
        with self.assertRaises(ValueError):
            self.run_build()
        self.assertFalse(self.output.exists())
        self.write([feature("pin_code", "302008", polygon(0, 0, 1, 1))], [
            feature("area_id", "one", polygon(0, 0, 2, 2)),
        ])
        self.sources["pins"]["inputSha256"] = "sha256:" + "0" * 64
        with self.assertRaises(ValueError):
            self.run_build()
        self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
