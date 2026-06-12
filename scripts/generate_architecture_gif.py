#!/usr/bin/env python3
"""Generate OMEGA architecture animated GIF (< 5 MB)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1100, 700
FPS = 10
DURATION_MS = 1000 // FPS
FRAMES = 40
OUT = Path(__file__).resolve().parents[1] / "omega-architecture.gif"

BG = (8, 10, 16)
BG2 = (14, 18, 28)
CYAN = (34, 211, 238)
CYAN_DIM = (22, 78, 99)
PURPLE = (192, 132, 252)
GREEN = (74, 222, 128)
AMBER = (251, 191, 36)
TEXT = (244, 244, 245)
TEXT_DIM = (161, 161, 170)
WHITE = (255, 255, 255)
LINE = (39, 48, 64)

PIPELINE = [
    {"id": "web", "label": "Open Web", "sub": "postmortems · RSS", "color": PURPLE},
    {"id": "obs", "label": "Observer", "sub": "classify", "color": CYAN},
    {"id": "sci", "label": "Scientist", "sub": "root cause", "color": CYAN},
    {"id": "sim", "label": "Simulator", "sub": "scenarios", "color": CYAN},
    {"id": "res", "label": "Response", "sub": "actions", "color": CYAN},
]

STORE = ["Langfuse", "ClickHouse", "cited.md"]
LOOP = [
    {"label": "Human Approve", "color": AMBER},
    {"label": "Prompt Optimizer", "color": GREEN},
    {"label": "CI Regression", "color": GREEN},
]

NODE_W, NODE_H = 148, 58
STORE_W, STORE_H = 130, 46
LOOP_W, LOOP_H = 148, 46
GAP = 52


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def layout_row(specs: list, y: int, box_w: int, box_h: int, gap: int) -> list[dict]:
    count = len(specs)
    total = count * box_w + (count - 1) * gap
    x0 = (W - total) // 2
    out = []
    for i, spec in enumerate(specs):
        if isinstance(spec, str):
            spec = {"label": spec}
        out.append({**spec, "x": x0 + i * (box_w + gap), "y": y, "w": box_w, "h": box_h})
    return out


def cxcy(box: dict) -> tuple[int, int]:
    return box["x"] + box["w"] // 2, box["y"] + box["h"] // 2


def tint(rgb: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(c * factor))) for c in rgb)


def draw_round_rect(d: ImageDraw.ImageDraw, box: dict, fill, outline, radius: int = 12, width: int = 2) -> None:
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    d.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill, outline=outline, width=width)


def draw_h_arrow(d: ImageDraw.ImageDraw, x1: int, y1: int, x2: int, y2: int, color, width: int = 2) -> None:
    d.line([(x1, y1), (x2 - 10, y2)], fill=color, width=width)
    d.polygon([(x2, y2), (x2 - 10, y2 - 5), (x2 - 10, y2 + 5)], fill=color)


def draw_v_arrow(d: ImageDraw.ImageDraw, x: int, y1: int, y2: int, color, width: int = 2) -> None:
    d.line([(x, y1), (x, y2 - 10)], fill=color, width=width)
    d.polygon([(x, y2), (x - 5, y2 - 10), (x + 5, y2 - 10)], fill=color)


def draw_frame(t: int) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    title_f = load_font(26, bold=True)
    sub_f = load_font(12)
    label_f = load_font(14, bold=True)
    small_f = load_font(11)
    section_f = load_font(10, bold=True)

    pipeline_y = 118
    bus_y = pipeline_y + NODE_H + 26
    store_y = 288
    bridge_y = bus_y + (store_y - bus_y) // 2
    loop_y = 478
    loop_bus_y = loop_y + LOOP_H + 34

    pipeline = layout_row(PIPELINE, pipeline_y, NODE_W, NODE_H, GAP)
    store_boxes = layout_row(STORE, store_y, STORE_W, STORE_H, 56)
    loop_boxes = layout_row(LOOP, loop_y, LOOP_W, LOOP_H, 56)

    pulse = (t % FRAMES) / FRAMES
    active_idx = int(pulse * len(pipeline)) % len(pipeline)

    # Header
    d.rounded_rectangle((40, 22, W - 40, 82), radius=14, fill=BG2, outline=LINE, width=1)
    d.text((W // 2, 42), "OMEGA Architecture", fill=WHITE, font=title_f, anchor="mm")
    d.text((W // 2, 64), "Autonomous Reality Defense System", fill=TEXT_DIM, font=sub_f, anchor="mm")

    pl, pr = cxcy(pipeline[0])[0], cxcy(pipeline[-1])[0]

    # Row labels — left-aligned, away from center spine
    d.text((pl, pipeline_y - 10), "LANGGRAPH PIPELINE", fill=TEXT_DIM, font=section_f, anchor="lb")
    d.text((pl, store_y - 10), "OBSERVABILITY & PUBLISH", fill=TEXT_DIM, font=section_f, anchor="lb")
    d.text((pl, loop_y - 10), "SELF-IMPROVEMENT LOOP", fill=TEXT_DIM, font=section_f, anchor="lb")

    # Pipeline arrows (only in gaps)
    for i in range(len(pipeline) - 1):
        a, b = pipeline[i], pipeline[i + 1]
        x1 = a["x"] + a["w"] + 8
        x2 = b["x"] - 8
        y = a["y"] + a["h"] // 2
        lit = i == active_idx
        col = CYAN if lit else CYAN_DIM
        draw_h_arrow(d, x1, y, x2, y, col, width=3 if lit else 2)
        if lit:
            prog = (pulse * len(pipeline)) % 1.0
            dot_x = int(x1 + (x2 - x1) * prog)
            d.ellipse([dot_x - 4, y - 4, dot_x + 4, y + 4], fill=WHITE)

    # Pipeline nodes
    for i, n in enumerate(pipeline):
        active = i == active_idx
        if active:
            glow = {
                "x": n["x"] - 4,
                "y": n["y"] - 4,
                "w": n["w"] + 8,
                "h": n["h"] + 8,
            }
            draw_round_rect(d, glow, tint(n["color"], 0.08), tint(n["color"], 0.35), radius=14, width=1)
        fill = tint(n["color"], 0.20 if active else 0.11)
        outline = n["color"] if active else tint(n["color"], 0.55)
        draw_round_rect(d, n, fill, outline, width=3 if active else 2)
        cx = n["x"] + n["w"] // 2
        d.text((cx, n["y"] + 22), n["label"], fill=TEXT if active else TEXT_DIM, font=label_f, anchor="mm")
        d.text((cx, n["y"] + 42), n["sub"], fill=TEXT_DIM, font=small_f, anchor="mm")

    # Bus bar under pipeline (horizontal only)
    pl, pr = cxcy(pipeline[0])[0], cxcy(pipeline[-1])[0]
    store_lit = active_idx >= 2
    bus_col = CYAN if store_lit else CYAN_DIM
    d.line([(pl, bus_y), (pr, bus_y)], fill=bus_col, width=2)

    # Bridge: vertical spine stops above store row; horizontal rail ties store boxes
    mid_x = (pl + pr) // 2
    rail_y = store_y - 16
    label_x = min(mid_x + 88, W - 240)
    d.text((label_x, bridge_y), "trace · store · publish", fill=TEXT_DIM, font=small_f, anchor="lm")
    draw_v_arrow(d, mid_x, bus_y + 2, rail_y, bus_col, width=2)
    sl, sr = cxcy(store_boxes[0])[0], cxcy(store_boxes[-1])[0]
    d.line([(sl, rail_y), (sr, rail_y)], fill=bus_col, width=2)
    for s in store_boxes:
        sx, _ = cxcy(s)
        draw_v_arrow(d, sx, rail_y, store_y - 4, bus_col, width=1)

    # Store nodes
    for i, s in enumerate(store_boxes):
        lit = store_lit and ((t + i * 5) % FRAMES) < FRAMES // 2
        fill = tint(CYAN, 0.22 if lit else 0.11)
        draw_round_rect(d, s, fill, CYAN if lit else CYAN_DIM, width=2)
        d.text((s["x"] + s["w"] // 2, s["y"] + s["h"] // 2), s["label"], fill=TEXT, font=label_f, anchor="mm")

    # Single drop from store row to loop row
    loop_mid_x = (cxcy(loop_boxes[0])[0] + cxcy(loop_boxes[-1])[0]) // 2
    draw_v_arrow(d, loop_mid_x, store_y + STORE_H + 6, loop_y - 8, CYAN_DIM, width=2)

    # Loop nodes
    loop_lit = (t % FRAMES) > FRAMES * 0.58
    loop_active = ((t % FRAMES) - int(FRAMES * 0.58)) // 4 if loop_lit else -1
    for i, b in enumerate(loop_boxes):
        lit = loop_lit and i <= loop_active
        fill = tint(b["color"], 0.22 if lit else 0.11)
        outline = b["color"] if lit else tint(b["color"], 0.55)
        draw_round_rect(d, b, fill, outline, width=2)
        d.text((b["x"] + b["w"] // 2, b["y"] + b["h"] // 2), b["label"], fill=TEXT, font=label_f, anchor="mm")

    # Loop return path — wide U below boxes, clear of all nodes
    if loop_lit:
        lx, _ = cxcy(loop_boxes[0])
        rx, _ = cxcy(loop_boxes[-1])
        d.line([(lx, loop_y + LOOP_H), (lx, loop_bus_y)], fill=tint(GREEN, 0.7), width=2)
        d.line([(lx, loop_bus_y), (rx, loop_bus_y)], fill=tint(GREEN, 0.7), width=2)
        d.line([(rx, loop_bus_y), (rx, loop_y + LOOP_H)], fill=tint(GREEN, 0.7), width=2)
        d.polygon([(rx, loop_y + LOOP_H), (rx - 5, loop_y + LOOP_H + 10), (rx + 5, loop_y + LOOP_H + 10)], fill=tint(GREEN, 0.7))
        d.text((loop_mid_x, loop_bus_y + 14), "feedback → prompts → CI gate", fill=TEXT_DIM, font=small_f, anchor="mm")

    # Footer + x402 badge (right side, no node overlap)
    d.rounded_rectangle((40, H - 50, W - 40, H - 18), radius=10, fill=BG2, outline=LINE, width=1)
    d.text(
        (56, H - 34),
        "open web in  →  grounded RCA out  →  self-improving loop",
        fill=TEXT_DIM,
        font=sub_f,
        anchor="lm",
    )
    x402 = {"x": W - 210, "y": H - 44, "w": 158, "h": 28}
    draw_round_rect(d, x402, tint(AMBER, 0.16), AMBER, radius=8, width=2)
    d.text((x402["x"] + x402["w"] // 2, x402["y"] + x402["h"] // 2), "HTTP 402 / x402", fill=AMBER, font=small_f, anchor="mm")

    return img


def main() -> None:
    frames = [draw_frame(t) for t in range(FRAMES)]
    quantized = []
    for f in frames:
        q = f.quantize(colors=80, method=Image.Quantize.MEDIANCUT)
        quantized.append(q.convert("P", palette=Image.Palette.ADAPTIVE, colors=80))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    quantized[0].save(
        OUT,
        save_all=True,
        append_images=quantized[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    size = OUT.stat().st_size
    print(f"Wrote {OUT} ({size:,} bytes, {size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
