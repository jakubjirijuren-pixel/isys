"""Generate Android launcher assets from the official FOXA SVG."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

root = Path("android/app/src/main/res")
svg = Path("public/icon.svg").read_bytes()
png = cairosvg.svg2png(bytestring=svg, output_width=1024, output_height=1024)
logo = Image.open(BytesIO(png)).convert("RGBA")
sizes = {"mdpi":48, "hdpi":72, "xhdpi":96, "xxhdpi":144, "xxxhdpi":192}
for density, size in sizes.items():
    directory = root / f"mipmap-{density}"
    directory.mkdir(parents=True, exist_ok=True)
    image = logo.resize((size, size), Image.Resampling.LANCZOS)
    image.save(directory / "ic_launcher.png")
    image.save(directory / "ic_launcher_round.png")
    # Adaptive foreground: safe-zone artwork, centered on transparent canvas.
    foreground = Image.new("RGBA", (size, size))
    inset = round(size * 0.18)
    foreground.alpha_composite(logo.resize((size - 2 * inset, size - 2 * inset), Image.Resampling.LANCZOS), (inset, inset))
    foreground.save(directory / "ic_launcher_foreground.png")
print("Generated FOXA Android launcher icons")
