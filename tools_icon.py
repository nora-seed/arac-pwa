"""Araç Takip PWA ikonlarını üretir (Pillow gerekir)."""
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
TOP = (37, 99, 235)
BOTTOM = (6, 182, 212)
WHITE = (255, 255, 255, 255)


def background():
    img = Image.new("RGBA", (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        color = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)) + (255,)
        draw.line([(0, y), (SIZE, y)], fill=color)

    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((SIZE * 0.45, -SIZE * 0.40, SIZE * 1.25, SIZE * 0.55), fill=(255, 255, 255, 44))
    glow = glow.filter(ImageFilter.GaussianBlur(SIZE // 18))
    img.alpha_composite(glow)

    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    r = ImageDraw.Draw(ring)
    r.ellipse((SIZE * 0.62, SIZE * 0.60, SIZE * 1.30, SIZE * 1.28), outline=(255, 255, 255, 28), width=int(SIZE * 0.05))
    ring = ring.filter(ImageFilter.GaussianBlur(SIZE // 40))
    img.alpha_composite(ring)
    return img


def rounded_mask(radius_ratio=0.22):
    mask = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    radius = int(SIZE * radius_ratio)
    d.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=radius, fill=255)
    return mask


def car(scale):
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = cy = SIZE / 2

    def box(x, y):
        return (cx + x * SIZE * scale, cy + y * SIZE * scale)

    def rrect(x0, y0, x1, y1, radius, fill=WHITE):
        a = box(x0, y0)
        b = box(x1, y1)
        r = max(2, int(abs(b[0] - a[0]) * radius))
        d.rounded_rectangle((a[0], a[1], b[0], b[1]), radius=r, fill=fill)

    rrect(-0.37, -0.02, 0.37, 0.16, 0.30)
    rrect(-0.20, -0.15, 0.16, 0.04, 0.34)
    rrect(-0.16, -0.12, -0.035, 0.005, 0.22, fill=(0, 0, 0, 0))
    rrect(0.015, -0.12, 0.135, 0.005, 0.22, fill=(0, 0, 0, 0))

    wheel_r = int(0.088 * SIZE * scale)
    ring = int(0.030 * SIZE * scale)
    for wx in (-0.225, 0.225):
        c = box(wx, 0.155)
        d.ellipse((c[0] - wheel_r, c[1] - wheel_r, c[0] + wheel_r, c[1] + wheel_r), outline=WHITE, width=ring)

    light = box(0.335, 0.06)
    lr = int(0.018 * SIZE * scale)
    d.ellipse((light[0] - lr, light[1] - lr, light[0] + lr, light[1] + lr), fill=(0, 0, 0, 0))

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    alpha = layer.getchannel("A").point(lambda a: int(a * 0.26))
    shadow.putalpha(alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(SIZE // 70))

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, int(SIZE * 0.014)))
    out.alpha_composite(layer)
    return out


def make(maskable=False):
    img = background()
    scale = 0.76 if maskable else 0.88
    img.alpha_composite(car(scale))
    if not maskable:
        img.putalpha(rounded_mask())
    return img


def main():
    import os
    os.makedirs("icons", exist_ok=True)
    for size in (192, 512):
        for maskable in (False, True):
            icon = make(maskable).resize((size, size), Image.LANCZOS)
            suffix = "-maskable" if maskable else ""
            icon.save(f"icons/icon-{size}{suffix}.png")
    print("ikonlar hazır:", sorted(os.listdir("icons")))


if __name__ == "__main__":
    main()
