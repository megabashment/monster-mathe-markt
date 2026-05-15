#!/usr/bin/env python3
"""
Pixellab v2 Asset Pipeline
Generiert und speichert Pixel-Art-Assets für Monster Mathe Markt.

Usage:
  python3 scripts/pixellab.py generate character --name "Blubbo" --desc "cute blue monster"
  python3 scripts/pixellab.py generate object    --name "coin-gold" --desc "gold coin" --size 32
  python3 scripts/pixellab.py generate background --name "shop" --desc "magic shop interior"
  python3 scripts/pixellab.py status
  python3 scripts/pixellab.py download
  python3 scripts/pixellab.py run character --name "Blubbo" --desc "..."   # generate + download in one
"""

import argparse, base64, json, os, struct, sys, time, urllib.error, urllib.request, zlib
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────
TOKEN   = os.getenv("PIXELLAB_TOKEN")
if not TOKEN:
    raise ValueError("ERROR: PIXELLAB_TOKEN env var not set. Set it before running: export PIXELLAB_TOKEN=your-token")
BASE    = "https://api.pixellab.ai/v2"
ROOT    = Path(__file__).parent.parent
OUT     = ROOT / "public"
JOBS_F  = ROOT / ".claude" / "pixellab-jobs.json"

# Style-Konsistenz (aus ARTWORK_GUIDANCE.md)
STYLE_SEED  = 42069
STYLE_SCALE = 12.0

# Erlaubte Enum-Werte der v2 API
OUTLINE_VALS = ("single color outline", "selective outline", "lineless")
SHADING_VALS = ("flat shading", "basic shading", "medium shading", "detailed shading")
DETAIL_VALS  = ("low detail", "medium detail", "high detail")

# Konfigurierte Style-Parameter pro Asset-Typ (aus ARTWORK_GUIDANCE.md)
STYLE_CHARACTER  = {"outline": "single color outline", "shading": "flat shading",   "detail": "low detail"}
STYLE_OBJECT     = {"outline": "single color outline", "shading": "medium shading",  "detail": "medium detail"}
STYLE_BACKGROUND = {"outline": "selective outline",    "shading": "basic shading",   "detail": "medium detail"}


# ── HTTP helpers ─────────────────────────────────────────────────────────────
def _request(method: str, path: str, body=None) -> dict:
    url  = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP {e.code}: {e.read().decode()}")

def get(path: str) -> dict:   return _request("GET", path)
def post(path: str, body: dict) -> dict: return _request("POST", path, body)


# ── PNG writer (kein PIL) ────────────────────────────────────────────────────
def rgba_to_png(raw: bytes, w: int, h: int) -> bytes:
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    lines = b"".join(b"\x00" + raw[y*w*4:(y+1)*w*4] for y in range(h))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(lines))
        + chunk(b"IEND", b"")
    )


# ── Jobs file ────────────────────────────────────────────────────────────────
def load_jobs() -> dict:
    if JOBS_F.exists():
        return json.loads(JOBS_F.read_text())
    return {"jobs": {}}

def save_jobs(data: dict) -> None:
    JOBS_F.write_text(json.dumps(data, indent=2) + "\n")
    print(f"   → Jobs gespeichert in {JOBS_F.relative_to(ROOT)}")


# ── Target path builder ───────────────────────────────────────────────────────
def target_path(asset_type: str, name: str, size: int, version: int = 1) -> str:
    slug = name.lower().replace(" ", "-")
    if asset_type == "character":
        return f"assets/monsters/monster-{slug}-idle-{size}px-v{version}.png"
    elif asset_type == "object":
        return f"assets/objects/object-{slug}-{size}px-v{version}.png"
    elif asset_type == "background":
        return f"assets/ui/ui-background-{slug}-{size}px-v{version}.png"
    raise ValueError(f"Unknown type: {asset_type}")


# ── Generate ─────────────────────────────────────────────────────────────────
def generate_character(name: str, desc: str, size: int = 64) -> dict:
    prompt = (
        f"{name}, {desc}. "
        "Kawaii chibi style, big round friendly eyes, pastel colors, "
        "no weapons, no scary elements, suitable for 7-8 year old girls. "
        "Simple readable silhouette."
    )
    payload = {
        "description": prompt,
        "image_size": {"width": size, "height": size},
        "seed": STYLE_SEED,
        "text_guidance_scale": STYLE_SCALE,
        **STYLE_CHARACTER,
    }
    print(f"   API: POST /v2/create-character-with-8-directions")
    return post("/create-character-with-8-directions", payload)


def generate_object(name: str, desc: str, size: int = 32) -> dict:
    prompt = (
        f"{name}, {desc}. "
        "Kawaii cute pixel art, pastel colors, transparent background, "
        "simple iconic shape readable at small size, school-appropriate."
    )
    payload = {
        "description": prompt,
        "image_size": {"width": size, "height": size},
        "seed": STYLE_SEED,
        "text_guidance_scale": STYLE_SCALE,
        **STYLE_OBJECT,
    }
    print(f"   API: POST /v2/map-objects")
    return post("/map-objects", payload)


def generate_background(name: str, desc: str) -> dict:
    prompt = (
        f"{desc}. "
        "Pixel art, warm pastel color palette, kawaii cute aesthetic, "
        "friendly welcoming atmosphere, no scary or violent elements, "
        "school-appropriate for 7-8 year old girls."
    )
    payload = {
        "description": prompt,
        "image_size": {"width": 400, "height": 200},
        "seed": STYLE_SEED,
        "text_guidance_scale": STYLE_SCALE,
        **STYLE_BACKGROUND,
    }
    print(f"   API: POST /v2/map-objects")
    return post("/map-objects", payload)


# ── Poll ──────────────────────────────────────────────────────────────────────
def poll_job(job_id: str, wait: bool = False) -> dict:
    while True:
        res = get(f"/background-jobs/{job_id}")
        status = res.get("status", "unknown")
        if status == "completed" or not wait:
            return res
        if status == "failed":
            raise SystemExit(f"Job {job_id} failed")
        print(f"   ⏳ {status}... (warte 15s)")
        time.sleep(15)


# ── Save PNG ──────────────────────────────────────────────────────────────────
def save_asset(job_res: dict, asset_type: str, tgt: str) -> None:
    lr = job_res["last_response"]
    out_path = OUT / tgt

    out_path.parent.mkdir(parents=True, exist_ok=True)

    if asset_type == "character":
        # RGBA base64 per Richtung → south oder erste verfügbare
        images = lr["images"]
        img = images.get("south") or images.get("east") or next(iter(images.values()))
        png = rgba_to_png(base64.b64decode(img["base64"]), img["width"], img["height"])
    else:
        # map_object → base64-PNG direkt im "image"-Feld
        png = base64.b64decode(lr["image"])

    out_path.write_bytes(png)
    size_kb = len(png) / 1024
    print(f"   ✅ Gespeichert: {tgt} ({size_kb:.1f}KB)")


# ── CLI commands ──────────────────────────────────────────────────────────────
def cmd_generate(args):
    jobs = load_jobs()
    name = args.name
    desc = args.desc
    size = getattr(args, "size", 64)

    print(f"\n📦 Generiere {args.type}: {name}")

    if args.type == "character":
        res = generate_character(name, desc, size)
    elif args.type == "object":
        size = getattr(args, "size", 32)
        res = generate_object(name, desc, size)
    elif args.type == "background":
        res = generate_background(name, desc)
    else:
        raise SystemExit(f"Unknown type: {args.type}")

    job_id = res.get("background_job_id")
    char_id = res.get("character_id") or res.get("object_id")
    status = res.get("status", "unknown")

    key = f"{args.type}-{name.lower().replace(' ', '-')}"
    jobs["jobs"][key] = {
        "type": args.type,
        "name": name,
        "job_id": job_id,
        "entity_id": char_id,
        "status": status,
        "size": size,
        "target": target_path(args.type, name, size),
    }
    save_jobs(jobs)
    print(f"   Job ID: {job_id} | Status: {status}")


def cmd_status(args):
    jobs = load_jobs()
    if not jobs["jobs"]:
        print("Keine Jobs gefunden.")
        return

    print("\n📊 Job Status:\n")
    for key, job in jobs["jobs"].items():
        job_id = job.get("job_id")
        if not job_id:
            print(f"   {key}: kein Job-ID")
            continue
        res = get(f"/background-jobs/{job_id}")
        status = res.get("status", "unknown")
        jobs["jobs"][key]["status"] = status
        icon = "✅" if status == "completed" else "⏳" if status in ("processing", "queued") else "❌"
        print(f"   {icon} {key}: {status}")

    save_jobs(jobs)


def cmd_download(args):
    jobs = load_jobs()
    downloaded = 0

    for key, job in jobs["jobs"].items():
        if job.get("status") != "completed":
            print(f"   ⏭️  {key}: Status={job.get('status')} — übersprungen")
            continue
        job_id = job["job_id"]
        res = poll_job(job_id, wait=False)
        if res.get("status") != "completed":
            print(f"   ⏳ {key}: noch nicht fertig")
            continue
        print(f"\n📥 {key}...")
        save_asset(res, job["type"], job["target"])
        downloaded += 1

    print(f"\n✅ {downloaded} Assets heruntergeladen.")


def cmd_run(args):
    """Generate + poll + download in einem Schritt."""
    cmd_generate(args)
    jobs = load_jobs()
    key = f"{args.type}-{args.name.lower().replace(' ', '-')}"
    job = jobs["jobs"][key]
    job_id = job["job_id"]

    print(f"\n⏳ Warte auf Fertigstellung (2-5 Min)...")
    res = poll_job(job_id, wait=True)

    jobs["jobs"][key]["status"] = "completed"
    save_jobs(jobs)

    print(f"\n📥 Speichere Asset...")
    save_asset(res, job["type"], job["target"])


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(description="Pixellab v2 Asset Pipeline")
    sub = p.add_subparsers(dest="cmd")

    # generate
    gen = sub.add_parser("generate", help="Job abschicken")
    gen.add_argument("type", choices=["character", "object", "background"])
    gen.add_argument("--name", required=True)
    gen.add_argument("--desc", required=True)
    gen.add_argument("--size", type=int, default=64)

    # run (generate + download)
    run = sub.add_parser("run", help="Generieren + sofort herunterladen")
    run.add_argument("type", choices=["character", "object", "background"])
    run.add_argument("--name", required=True)
    run.add_argument("--desc", required=True)
    run.add_argument("--size", type=int, default=64)

    # status
    sub.add_parser("status", help="Job-Status aller aktiven Jobs anzeigen")

    # download
    sub.add_parser("download", help="Alle fertigen Jobs herunterladen")

    args = p.parse_args()

    if args.cmd == "generate":   cmd_generate(args)
    elif args.cmd == "run":      cmd_run(args)
    elif args.cmd == "status":   cmd_status(args)
    elif args.cmd == "download": cmd_download(args)
    else:                        p.print_help()


if __name__ == "__main__":
    main()
