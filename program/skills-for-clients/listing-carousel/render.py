"""Render a listing carousel plan (slides.json) into 1080x1350 PNG slides plus a preview sheet.

Usage: python render.py path/to/slides.json
Needs only Pillow. Photos are paths relative to slides.json.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

W, H, M = 1080, 1350, 72

def font(bold, size):
    names = (["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf", "Arial Bold.ttf"] if bold
             else ["DejaVuSans.ttf", "LiberationSans-Regular.ttf", "Arial.ttf"])
    dirs = ["", "/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/truetype/liberation/",
            "/usr/share/fonts/TTF/", "/Library/Fonts/", "C:/Windows/Fonts/"]
    for n in names:
        for d in dirs:
            try:
                return ImageFont.truetype(d + n, size)
            except OSError:
                pass
    return ImageFont.load_default(size)

def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def cover(img, focus):
    # Crop to 4:5 portrait, keeping the horizontal focus point (0 = left edge, 1 = right edge) in frame
    scale = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    x = round((img.width - W) * focus)
    y = round((img.height - H) / 2)
    return img.crop((x, y, x + W, y + H))

def wrap(draw, text, f, width):
    lines, line = [], ""
    for word in text.split():
        test = (line + " " + word).strip()
        if draw.textlength(test, font=f) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines

def shade(img, ink):
    # Dark wash at the top and bottom so text stays readable on any photo
    over = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(over)
    for yy in range(H):
        top = max(0.0, 1 - yy / (H * 0.22)) * 0.55
        b = (yy - H * 0.42) / (H * 0.58)
        bottom = 0 if b < 0 else min(0.92, 0.75 * b / 0.5 if b < 0.5 else 0.75 + 0.17 * (b - 0.5) / 0.5)
        d.line([(0, yy), (W, yy)], fill=ink + (round(255 * max(top, bottom)),))
    return Image.alpha_composite(img.convert("RGBA"), over)

def render_slide(base, s, plan, i, total):
    brand = plan["brand"]
    ink, accent = hexrgb(brand.get("ink", "#0E1A2B")), hexrgb(brand.get("accent", "#D4A84B"))
    img = shade(cover(Image.open(os.path.join(base, s["photo"])).convert("RGB"), s.get("focus", 0.5)), ink)
    d = ImageDraw.Draw(img)
    white = (255, 255, 255)
    d.text((M, 62), brand["team"].upper(), font=font(True, 22), fill=white)
    d.rectangle([M, 104, M + 88, 109], fill=accent)

    fh, fs, fe = font(True, 64), font(False, 30), font(True, 22)
    head = wrap(d, s["headline"], fh, W - 2 * M - 40)
    sub = wrap(d, s.get("sub", ""), fs, W - 2 * M - 40) if s.get("sub") else []
    block = 30 + len(head) * 74 + 18 + len(sub) * 40 + (90 if s.get("button") else 0)
    y = H - 150 - block
    d.text((M, y), s.get("eyebrow", "").upper(), font=fe, fill=accent)
    y += 40
    for ln in head:
        d.text((M, y), ln, font=fh, fill=white)
        y += 74
    y += 14
    for ln in sub:
        d.text((M, y), ln, font=fs, fill=(235, 238, 243))
        y += 40
    if s.get("button"):
        fb = font(True, 22)
        label = s["button"].upper()
        bw = d.textlength(label, font=fb) + 52
        d.rectangle([M, y + 24, M + bw, y + 84], outline=accent, width=3)
        d.text((M + 26, y + 41), label, font=fb, fill=white)

    d.line([(M, H - 104), (W - M, H - 104)], fill=white, width=2)
    d.text((M, H - 80), plan.get("footer", "").upper(), font=font(True, 22), fill=white)
    count = f"{i + 1} / {total}"
    d.text((W - M - d.textlength(count, font=font(False, 22)), H - 80), count, font=font(False, 22), fill=white)
    return img.convert("RGB")

def main(path):
    plan = json.load(open(path))
    base = os.path.dirname(os.path.abspath(path))
    out = os.path.join(base, "output")
    os.makedirs(out, exist_ok=True)
    slides = [render_slide(base, s, plan, i, len(plan["slides"])) for i, s in enumerate(plan["slides"])]
    for i, img in enumerate(slides):
        img.save(os.path.join(out, f"slide_{i + 1}.png"))
    tw, th, gap = 324, 405, 24
    sheet = Image.new("RGB", (gap + len(slides) * (tw + gap), th + 2 * gap), (236, 233, 227))
    for i, img in enumerate(slides):
        sheet.paste(img.resize((tw, th), Image.LANCZOS), (gap + i * (tw + gap), gap))
    sheet.save(os.path.join(out, "preview.png"))
    print(f"Rendered {len(slides)} slides to {out}")

if __name__ == "__main__":
    main(sys.argv[1])
