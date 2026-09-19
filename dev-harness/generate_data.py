"""
Synthetic slides for the patch grid harness: DZI tiles, tissue masks and
annotations, shaped like the API answers — so the tab can be tried with no
backend, no login and no real data.

    python dev-harness/generate_data.py            # writes dev-harness/data/

Needs Pillow and numpy (any Python that has them; ml/.venv does).
Everything is deterministic. Coordinates are level-0 pixels at 0.25 µm/px.
"""

import json
import math
import random
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent / "data"
TILE = 256
NOW = "2026-09-19T10:00:00Z"


def blob(cx, cy, r, n, seed, wobble=0.22):
    rng = random.Random(seed)
    phases = [rng.uniform(0, 6.28) for _ in range(3)]
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        rr = r * (1 + wobble * math.sin(3 * a + phases[0]) + wobble * 0.5 * math.sin(7 * a + phases[1])
                  + wobble * 0.15 * math.sin(23 * a + phases[2]))
        pts.append((round(cx + rr * math.cos(a), 1), round(cy + rr * math.sin(a) * 0.85, 1)))
    return pts


def api_points(pts):
    return [{"x": x, "y": y} for x, y in pts]


# ── slides ───────────────────────────────────────────────────────────────────

def resection():
    """A resection: one large piece with a hole and an island in it, two fragments."""
    w, h = 20000, 15000
    tissue = [
        {"exterior": blob(8600, 7400, 5600, 900, 1), "holes": [blob(7600, 6600, 1500, 240, 2)]},
        {"exterior": blob(7600, 6650, 520, 120, 3), "holes": []},
        {"exterior": blob(16800, 3600, 1500, 300, 4), "holes": []},
        {"exterior": blob(17200, 11800, 900, 200, 5), "holes": []},
        {"exterior": blob(15200, 8300, 190, 60, 6), "holes": []},          # smaller than a 256 µm patch
    ]
    regions = [  # (owner, label, polygon)
        ("u-ayse", "G3", blob(6200, 9600, 2300, 160, 11)),
        ("u-ayse", "G4", blob(6000, 9900, 800, 90, 12)),                   # drawn inside the G3 region
        ("u-ayse", "G4", blob(11200, 5200, 1900, 140, 13)),
        ("u-ayse", "G5", blob(12300, 9300, 1300, 110, 14)),
        ("u-ayse", "G3", blob(16800, 3600, 1100, 100, 15)),
        ("u-mehmet", "G4", blob(6500, 9400, 2000, 120, 21)),
        ("u-mehmet", "G3", blob(11500, 5600, 2200, 120, 22)),
    ]
    annotations = [ann(f"r{i:03d}", "at-pattern", "Gleason Pattern", owner, "manual", label, poly)
                   for i, (owner, label, poly) in enumerate(regions)]
    # one annotator with a second annotation type …
    annotations += [ann("t000", "at-tumor", "Tümör Bölgesi", "u-ayse", "manual", "tümör", blob(9000, 7600, 4300, 200, 41)),
                    ann("t001", "at-tumor", "Tümör Bölgesi", "u-ayse", "manual", "nekroz", blob(12900, 8800, 700, 80, 42))]
    # … and labels that came with the dataset, next to the people's
    annotations += [ann(f"i{k:03d}", "at-score", f"dataset_{k % 3}.json", "imported-placeholder", "imported",
                        "G4" if k % 2 else "G3", blob(10400 + 330 * (k % 5), 4300 + 330 * (k // 5), 120, 12, 50 + k))
                    for k in range(20)]
    return {"id": "img-resection", "name": "resection_01.svs", "width": w, "height": h, "mpp": 0.25,
            "label": "40x", "tissue": tissue, "status": "approved", "annotations": annotations,
            "glands": []}


def glands():
    """A biopsy with hundreds of gland-sized polygons from an imported dataset."""
    w, h = 12000, 9000
    tissue = [
        {"exterior": blob(3900, 4500, 2900, 600, 31, wobble=0.12), "holes": []},
        {"exterior": blob(9000, 4400, 2200, 500, 32, wobble=0.15), "holes": []},
    ]
    rng = random.Random(7)
    annotations, shapes = [], []
    centres = [(3900, 4500, 2300), (9000, 4400, 1700)]
    for k in range(520):
        cx, cy, spread = centres[k % 2]
        a, d = rng.uniform(0, 6.28), spread * math.sqrt(rng.random())
        x, y = cx + d * math.cos(a), cy + d * math.sin(a) * 0.8
        # tumour sits in the upper left of each piece, so the labels form zones
        zone = (x - cx) + (y - cy)
        label = "benign" if zone > 600 else ("G3" if zone > -700 else "G4")
        poly = blob(x, y, rng.uniform(45, 110), rng.randint(10, 16), 1000 + k, wobble=0.18)
        shapes.append(poly)
        annotations.append(ann(f"g{k:04d}", "at-score", f"dataset_{k % 4}.json", "imported-placeholder",
                               "imported", label, poly))
    return {"id": "img-glands", "name": "biopsy_glands_07.svs", "width": w, "height": h, "mpp": 0.25,
            "label": "40x", "tissue": tissue, "status": "edited", "annotations": annotations,
            "glands": shapes}


def ann(id_, type_id, name, owner, resource, label, poly):
    return {"id": id_, "entity_type": "annotation", "creator_id": owner, "name": name,
            "parent": {"id": "set-by-harness", "type": "image"}, "annotation_type_id": type_id,
            "ws_id": "ws-demo", "tag_type": "select", "value": label, "is_global": False,
            "polygon": api_points(poly), "resource": resource, "review_ids": [],
            "created_at": NOW, "updated_at": NOW}


# ── tiles ────────────────────────────────────────────────────────────────────

def write_dzi(slide, folder: Path):
    """Tiles are drawn straight from the polygons, level by level — the full
    image never exists in memory."""
    w, h = slide["width"], slide["height"]
    max_level = math.ceil(math.log2(max(w, h)))
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "image.dzi").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
        f'Format="jpg" Overlap="0" TileSize="{TILE}"><Size Width="{w}" Height="{h}"/></Image>')
    rng = np.random.default_rng(3)
    grain = rng.normal(0, 7, (TILE, TILE, 1)).astype(np.float32)
    count = 0
    for level in range(max_level, -1, -1):
        scale = 2 ** (max_level - level)
        lw, lh = math.ceil(w / scale), math.ceil(h / scale)
        if max(lw, lh) < 1:
            break
        level_dir = folder / "image_files" / str(level)
        level_dir.mkdir(parents=True, exist_ok=True)
        for ty in range(math.ceil(lh / TILE)):
            for tx in range(math.ceil(lw / TILE)):
                tw, th = min(TILE, lw - tx * TILE), min(TILE, lh - ty * TILE)
                tile = Image.new("RGB", (tw, th), (244, 241, 243))
                draw = ImageDraw.Draw(tile)

                def local(pts):
                    return [(x / scale - tx * TILE, y / scale - ty * TILE) for x, y in pts]

                for piece in slide["tissue"]:
                    draw.polygon(local(piece["exterior"]), fill=(226, 168, 198))
                    for hole in piece["holes"]:
                        draw.polygon(local(hole), fill=(244, 241, 243))
                for a in slide["annotations"]:
                    if not slide["glands"] and a["annotation_type_id"] == "at-pattern":   # tumour regions: a denser, darker stroma
                        pts = [(p["x"], p["y"]) for p in a["polygon"]]
                        draw.polygon(local(pts), fill=(196, 128, 176))
                for poly in slide["glands"]:
                    draw.polygon(local(poly), fill=(150, 96, 160), outline=(110, 70, 130))
                pixels = np.asarray(tile, dtype=np.float32)
                tissue_mask = (pixels.sum(axis=2, keepdims=True) < 700)
                pixels = np.clip(pixels + grain[:th, :tw] * tissue_mask, 0, 255).astype(np.uint8)
                Image.fromarray(pixels).filter(ImageFilter.GaussianBlur(0.6)).save(
                    level_dir / f"{tx}_{ty}.jpg", quality=80)
                count += 1
    return count


def mask_doc(slide, status):
    points = sum(len(p["exterior"]) + sum(len(h) for h in p["holes"]) for p in slide["tissue"])
    return {"image_id": slide["id"], "ws_id": "ws-demo", "status": status, "revision": 3,
            "algorithm_version": "tissue-v1", "params": {},
            "polygons": [{"exterior": api_points(p["exterior"]), "holes": [api_points(h) for h in p["holes"]]}
                         for p in slide["tissue"]],
            "preview_width": 2048, "preview_height": 1536, "level0_width": slide["width"],
            "level0_height": slide["height"], "downsample_x": slide["width"] / 2048,
            "downsample_y": slide["height"] / 1536, "tissue_area_ratio": 0.3, "point_count": points,
            "rejected_at": NOW if status == "rejected" else None,
            "reject_reason": "Boyama başarısız" if status == "rejected" else None,
            "created_at": NOW, "updated_at": NOW}


def image_doc(slide, id_, name, mpp):
    return {"id": id_, "ws_id": "ws-demo", "parent": {"id": "patient-demo", "type": "patient"},
            "creator_id": "u-ayse", "name": name, "processed_path": slide["id"], "format": "svs",
            "width": slide["width"], "height": slide["height"], "mpp": mpp,
            "magnification_label": slide["label"] if mpp else None, "status": "processed",
            "created_at": NOW, "updated_at": NOW}


if __name__ == "__main__":
    if OUT.exists():
        shutil.rmtree(OUT)
    a, b = resection(), glands()
    images, masks, annotations = [], {}, {}

    def add(slide, id_, name, mpp=0.25, status=None, with_mask=True, with_annotations=True):
        images.append(image_doc(slide, id_, name, mpp))
        masks[id_] = mask_doc(slide, status or slide["status"]) if with_mask else None
        annotations[id_] = slide["annotations"] if with_annotations else []

    add(a, "img-resection", a["name"])
    add(b, "img-glands", b["name"])
    add(b, "img-glands-rejected", "biopsy_rejected_mask.svs", status="rejected")
    add(a, "img-resection-nomask", "resection_no_mask.svs", with_mask=False)
    add(a, "img-resection-nompp", "resection_no_mpp.png", mpp=None)
    add(b, "img-glands-empty", "biopsy_no_annotations.svs", with_annotations=False)

    for slide in (a, b):
        print(f"{slide['id']}: {write_dzi(slide, OUT / 'tiles' / slide['id'])} tiles")
    (OUT / "api.json").write_text(json.dumps({
        "images": images, "masks": masks, "annotations": annotations,
        "users": {"u-ayse": "Dr. Ayşe Demir", "u-mehmet": "Dr. Mehmet Kaya"},
        "annotation_types": {"at-pattern": "Gleason Pattern", "at-score": "Gleason Skorlama",
                             "at-tumor": "Tümör Bölgesi"},
    }))
    print(f"{OUT / 'api.json'}: {len(images)} images")
