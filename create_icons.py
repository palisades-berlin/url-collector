#!/usr/bin/env python3
"""Generate notebook-style PNG icons for the URL Collector Chrome extension."""
import struct, zlib, os, math

# ── PNG writer (no external dependencies) ────────────────────────────────────

def write_png(path, width, height, pixels):
    """Write RGBA pixel grid to a PNG file."""
    def chunk(name, data):
        body = name + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    ihdr = chunk(b'IHDR', struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0]))
    raw  = b''.join(b'\x00' + b''.join(bytes(p) for p in row) for row in pixels)
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend)

# ── Drawing helpers ───────────────────────────────────────────────────────────

def draw_notebook(S):
    px = [[(0, 0, 0, 0)] * S for _ in range(S)]

    def set_px(x, y, c):
        if 0 <= x < S and 0 <= y < S:
            px[y][x] = c

    def fill(x0, y0, x1, y1, c):
        for y in range(max(0, y0), min(S, y1)):
            for x in range(max(0, x0), min(S, x1)):
                set_px(x, y, c)

    def circle(cx, cy, r, c):
        ir = int(r)
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                if dx * dx + dy * dy <= r * r:
                    set_px(int(cx) + dx, int(cy) + dy, c)

    # ── Palette ──────────────────────────────────────────────────────────────
    SPINE  = ( 13,  71, 161, 255)   # #0d47a1  dark blue spine
    COVER  = ( 21, 101, 192, 255)   # #1565c0  blue cover
    PAGE   = (255, 255, 255, 255)   # white page
    RULE   = (173, 210, 240, 255)   # light blue ruled lines
    SPIRAL = (255, 255, 255, 210)   # white spiral rings

    # ── Layout (all proportional to S) ───────────────────────────────────────
    m   = max(1, round(S * 0.06))   # outer margin
    sp  = max(2, round(S * 0.16))   # spine width
    rad = max(2, round(S * 0.10))   # rounded-corner radius

    bx0, by0 = m,     m
    bx1, by1 = S - m, S - m

    # ── Cover (rounded rectangle) ────────────────────────────────────────────
    fill(bx0 + rad, by0,       bx1 - rad, by1,       COVER)
    fill(bx0,       by0 + rad, bx1,       by1 - rad, COVER)
    for (ccx, ccy) in [(bx0 + rad, by0 + rad),
                       (bx1 - rad, by0 + rad),
                       (bx0 + rad, by1 - rad),
                       (bx1 - rad, by1 - rad)]:
        circle(ccx, ccy, rad, COVER)

    # ── Spine (left strip, darker) ────────────────────────────────────────────
    fill(bx0,           by0 + rad, bx0 + sp, by1 - rad, SPINE)
    fill(bx0 + rad,     by0,       bx0 + sp, by0 + rad, SPINE)
    fill(bx0 + rad,     by1 - rad, bx0 + sp, by1,       SPINE)
    circle(bx0 + rad, by0 + rad, rad, SPINE)
    circle(bx0 + rad, by1 - rad, rad, SPINE)
    # Ensure solid left edge
    fill(bx0, by0 + rad, bx0 + rad, by1 - rad, SPINE)

    # ── White page area ───────────────────────────────────────────────────────
    pg_pad_x = max(1, round(S * 0.05))
    pg_pad_y = max(1, round(S * 0.09))
    px0 = bx0 + sp + pg_pad_x
    py0 = by0 + pg_pad_y
    px1 = bx1 - pg_pad_x
    py1 = by1 - pg_pad_y
    if px0 < px1 and py0 < py1:
        fill(px0, py0, px1, py1, PAGE)

    # ── Ruled lines ───────────────────────────────────────────────────────────
    if S >= 24:
        n_lines  = max(2, round(S / 18))
        step     = (py1 - py0) / (n_lines + 1)
        lh       = max(1, round(S * 0.025))
        lm       = max(1, round(S * 0.04))
        for i in range(1, n_lines + 1):
            ly = py0 + round(i * step)
            fill(px0 + lm, ly, px1 - lm, ly + lh, RULE)

    # ── Spiral rings on spine ─────────────────────────────────────────────────
    ring_r  = max(1.0, S * 0.042)
    ring_cx = bx0 + sp * 0.5
    if S >= 32:
        n_rings = max(3, round(S / 14))
        span    = (by1 - by0) - 2 * m
        for i in range(n_rings):
            ry = by0 + m + round((i + 0.5) * span / n_rings)
            circle(ring_cx, ry, ring_r, SPIRAL)
    else:
        for i in range(3):
            ry = by0 + round((i + 1) * (by1 - by0) / 4)
            circle(ring_cx, ry, ring_r, SPIRAL)

    return px

# ── Main ─────────────────────────────────────────────────────────────────────

sizes    = [16, 48, 128]
base_dir = os.path.dirname(os.path.abspath(__file__))
icon_dir = os.path.join(base_dir, 'icons')
os.makedirs(icon_dir, exist_ok=True)

for s in sizes:
    pixels = draw_notebook(s)
    out    = os.path.join(icon_dir, f'icon{s}.png')
    write_png(out, s, s, pixels)
    print(f'  Created icons/icon{s}.png  ({s}x{s})')

print('Done!')
