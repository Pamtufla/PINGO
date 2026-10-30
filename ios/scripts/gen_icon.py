#!/usr/bin/env python3
"""Solid Halloween icon (1024² PNG) without external deps."""
from __future__ import annotations
import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "Pingo" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon.png"
SIZE = 1024
BG = (26, 10, 46)       # #1a0a2e
FG = (255, 107, 53)     # #ff6b35


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: pathlib.Path, rgb: tuple[int, int, int], size: int = SIZE) -> None:
    raw = bytearray()
    r, g, b = rgb
    row = bytes([0]) + bytes([r, g, b]) * size
    for _ in range(size):
        raw.extend(row)
    # pumpkin circle overlay
    cx = cy = size // 2
    radius = size // 3
    px = bytearray(raw)
    for y in range(size):
        for x in range(size):
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                i = y * (1 + size * 3) + 1 + x * 3
                px[i : i + 3] = bytes(FG)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(px), 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    write_png(OUT, BG)
