"""
Real masks and annotations for the patch grid harness, from the local dataset
mirror that dev-ingestor pulls (no cloud access, nothing is written back).

    python dev-harness/from_mirror.py Zenodo-Dataset Gleason_CNN     # a few images of each
    python dev-harness/from_mirror.py Zenodo-Dataset --images 8

Needs the `histopathai` package (ml/.venv has it). The slide pixels are not
read: the tiles are drawn from the tissue mask, so the polygons and everything
computed from them are real and the picture is a stand-in, drawn only up to
4096 px (deeper zoom shows plain grey tiles). Replaces
dev-harness/data, like generate_data.py does.
"""

import argparse
import json
import shutil
import warnings

import histopathai as hp
import pandas as pd

from generate_data import NOW, OUT, write_blank_tile, write_dzi

warnings.filterwarnings("ignore")


def points(raw):
    return [(float(p["X"] if "X" in p else p["x"]), float(p["Y"] if "Y" in p else p["y"])) for p in raw]


def clean(value):
    """JSON-safe: pandas NaN / NA → None, numpy scalars → Python."""
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if value is None or (isinstance(value, float) and value != value) or value is pd.NA:
        return None
    return value.item() if hasattr(value, "item") else value


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("workspaces", nargs="+")
    parser.add_argument("--images", type=int, default=4, help="images per workspace (default 4)")
    args = parser.parse_args()

    if OUT.exists():
        shutil.rmtree(OUT)
    images, masks, annotations, users, types = [], {}, {}, {}, {}

    for ws in args.workspaces:
        ds = hp.local(workspace_id=ws)
        frame, anns = ds.images(), ds.annotations()
        region = anns[~anns.is_global.fillna(False).astype(bool)]
        # Images where a choice has to be made come first (several annotators), then
        # one image per annotator in turn — in some workspaces no image has two.
        rank = region.groupby("_image_id").agg(owners=("creator_id", "nunique"), n=("id", "size"),
                                               first=("creator_id", "first"))
        rank = rank.sort_values(["owners", "n"], ascending=False)
        rank["turn"] = rank.groupby("first").cumcount()
        rank = rank.sort_values(["owners", "turn", "n"], ascending=[False, True, False])
        picked = 0
        for image_id in rank.index:
            if picked == args.images:
                break
            image = frame[frame.id == image_id].iloc[0].to_dict()
            if not (image.get("width") and image.get("height")):
                continue
            mask = ds.tissue_mask(image_id)
            mine = region[region._image_id == image_id].to_dict("records")

            tissue = []
            for p in (mask or {}).get("polygons") or []:
                tissue.append({"exterior": points(p.get("exterior") or []),
                               "holes": [points(h["points"]) for h in p.get("holes") or []]})
            slide = {"id": image_id, "width": int(image["width"]), "height": int(image["height"]),
                     "tissue": tissue, "annotations": [], "glands": [points(a["polygon"]) for a in mine
                                                                     if isinstance(a.get("polygon"), list)]}
            print(f"{ws} / {image['name']}: {len(mine)} polygons, "
                  f"{len({a['creator_id'] for a in mine})} annotators, {write_dzi(slide, OUT / 'tiles' / image_id, max_side=4096)} tiles")

            images.append(clean({"id": image_id, "ws_id": image.get("ws_id") or ws,
                                 "parent": {"id": "patient", "type": "patient"}, "creator_id": image.get("creator_id"),
                                 "name": f"{ws} · {image['name']}", "processed_path": image_id,
                                 "format": image.get("format") or "svs", "width": slide["width"],
                                 "height": slide["height"], "mpp": image.get("mpp"),
                                 "magnification_label": image.get("magnification_label"), "status": "processed",
                                 "created_at": NOW, "updated_at": NOW}))
            if mask:
                doc = {k: v for k, v in mask.items() if not k.startswith("_")}
                doc["polygons"] = [{"exterior": [{"x": x, "y": y} for x, y in t["exterior"]],
                                    "holes": [[{"x": x, "y": y} for x, y in h] for h in t["holes"]]} for t in tissue]
                doc.update(image_id=image_id, created_at=NOW, updated_at=NOW, edited_at=None, approved_at=None,
                           rejected_at=None, level0_width=slide["width"], level0_height=slide["height"])
                masks[image_id] = clean(doc)
            else:
                masks[image_id] = None
            annotations[image_id] = [clean({
                "id": a["id"], "entity_type": "annotation", "creator_id": a.get("creator_id"), "name": a.get("name"),
                "parent": {"id": image_id, "type": "image"}, "annotation_type_id": a.get("annotation_type_id"),
                "ws_id": a.get("ws_id") or ws, "tag_type": a.get("tag_type"), "value": a.get("value"),
                "is_global": False, "polygon": a.get("polygon"), "resource": a.get("resource"), "review_ids": [],
                "created_at": NOW, "updated_at": NOW}) for a in mine]
            for a in mine:
                if a.get("resource") != "imported" and a.get("creator_id"):
                    users.setdefault(a["creator_id"], f"Kullanıcı {str(a['creator_id'])[:4]}")
                types.setdefault(a.get("annotation_type_id"), f"tür {str(a.get('annotation_type_id'))[:4]}")
            picked += 1

    write_blank_tile()
    (OUT / "api.json").write_text(json.dumps({"images": images, "masks": masks, "annotations": annotations,
                                              "users": users, "annotation_types": types}))
    print(f"{OUT / 'api.json'}: {len(images)} images")


if __name__ == "__main__":
    main()
