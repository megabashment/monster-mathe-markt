#!/usr/bin/env python3
"""
Download Pixellab v2 Assets
Konvertiert RGBA-Bytes → PNG (kein PIL nötig)
"""
import json, base64, struct, zlib, urllib.request, os, sys

TOKEN = "05993614-8bde-41d9-9c12-d2eeb198bcb1"
BASE = "https://api.pixellab.ai"
OUT  = os.path.join(os.path.dirname(__file__), "..", "public")

JOBS = {
    "monster-blubbo": {
        "type": "character",
        "job_id": "f360d48a-3066-4be5-a134-4caaf01616a1",
        "target": "assets/monsters/monster-blubbo-idle-64px-v1.png",
        "direction": "south",
    },
    "object-coin-gold": {
        "type": "map_object",
        "job_id": "0a1bd23b-d9ea-41e0-ab14-337fa96ef286",
        "target": "assets/objects/object-coin-gold-32px-v1.png",
    },
    "ui-background-shop": {
        "type": "map_object",
        "job_id": "60eb5d7b-d1e8-483b-ba62-86317411c9d3",
        "target": "assets/ui/ui-background-shop-400x200px-v1.png",
    },
}


def rgba_to_png(raw: bytes, width: int, height: int) -> bytes:
    """Convert raw RGBA bytes to PNG without PIL."""
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))

    # Build scanlines: filter byte 0 + RGBA row
    lines = b"".join(b"\x00" + raw[y * width * 4:(y + 1) * width * 4] for y in range(height))
    idat = chunk(b"IDAT", zlib.compress(lines))
    iend = chunk(b"IEND", b"")

    return sig + ihdr + idat + iend


def api_get(path: str) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    for dir_ in ["assets/monsters", "assets/objects", "assets/ui"]:
        os.makedirs(os.path.join(OUT, dir_), exist_ok=True)

    for name, job in JOBS.items():
        print(f"\n📥 {name}...")
        try:
            res = api_get(f"/v2/background-jobs/{job['job_id']}")

            if res.get("status") != "completed":
                print(f"   ⏳ Status: {res.get('status')}")
                continue

            lr = res["last_response"]

            if job["type"] == "character":
                # Character: RGBA base64 per direction
                images = lr["images"]
                direction = job.get("direction", "south")
                img = images.get(direction) or next(iter(images.values()))
                w, h = img["width"], img["height"]
                raw = base64.b64decode(img["base64"])
                png = rgba_to_png(raw, w, h)
            else:
                # Map object: image ist Base64-PNG direkt
                png = base64.b64decode(lr["image"])

            out_path = os.path.join(OUT, job["target"])
            with open(out_path, "wb") as f:
                f.write(png)

            print(f"   ✅ {job['target']} ({w}x{h}, {len(png)//1024}KB)")

        except Exception as e:
            print(f"   ❌ {e}")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
