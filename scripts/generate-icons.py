#!/usr/bin/env python3
import os
from PIL import Image

def generate_icons():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_icon = os.path.join(project_root, 'resources', 'widoken-taskbar.png')
    out_dir = os.path.join(project_root, 'build', 'icons')

    if not os.path.exists(src_icon):
        print(f"Source icon not found at {src_icon}")
        return

    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src_icon)

    sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(out_dir, f"{size}x{size}.png")
        resized.save(out_path, format="PNG")
        print(f"Generated {out_path} ({size}x{size})")

    print("All standard icons generated successfully.")

if __name__ == '__main__':
    generate_icons()

