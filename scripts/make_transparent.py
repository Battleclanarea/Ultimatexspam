#!/usr/bin/env python3
"""Remove the baked "transparency checkerboard" background the image model draws
instead of a real alpha channel. The checker is bright + near-gray (low saturation),
so we key out those pixels GLOBALLY (handles enclosed gaps: halo interiors, gaps
between ribbons/limbs), then a morphological CLOSE (dilate->erode) refills tiny
holes from near-white armor glints while leaving large interior gaps transparent.
Downscale with LANCZOS for a lean repo + smooth anti-aliased edges. Outputs RGBA PNG."""
import sys, os
from PIL import Image, ImageFilter

def build_mask(im):
    # returns 'L' image: 255 = keep (armor), 0 = background checker
    r, g, b = im.split()
    src = im.load()
    w, h = im.size
    mask = Image.new("L", (w, h), 255)
    mpx = mask.load()
    for y in range(h):
        for x in range(w):
            pr, pg, pb = src[x, y]
            mx = pr if pr > pg else pg
            if pb > mx: mx = pb
            mn = pr if pr < pg else pg
            if pb < mn: mn = pb
            # checkerboard squares: bright (white ~255, light gray ~200) and near-gray
            if mx > 172 and (mx - mn) < 42:
                mpx[x, y] = 0
    return mask

def process(src, dst, out_size=512):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    mask = build_mask(im)
    # CLOSE: dilate opaque (MaxFilter) then erode (MinFilter) to fill small holes
    # (near-white glints inside the armor) without touching large interior gaps.
    mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    # tiny blur for anti-aliased cut edges
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    im = im.convert("RGBA")
    im.putalpha(mask)
    if out_size and out_size < w:
        im = im.resize((out_size, out_size), Image.LANCZOS)
    im.save(dst, "PNG", optimize=True)
    hist = mask.histogram()
    op = sum(hist[128:]) / float(w * h)
    print(f"{os.path.basename(dst)} opaque={op*100:.1f}% -> {os.path.getsize(dst)//1024}KB")

if __name__ == "__main__":
    for src in sys.argv[1:]:
        dst = src.rsplit(".", 1)[0] + "_t.png"
        process(src, dst)
