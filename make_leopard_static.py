import os
from PIL import Image
import numpy as np

BRAIN_DIR = r"C:\Users\pkuzo\.gemini\antigravity\brain\c517c35b-7e71-4018-99da-e03b4caf2cc2"
src_path = os.path.join(BRAIN_DIR, "leopard_raw_1786794729817.jpg")

def cutout_white_background(img_rgb, threshold=238):
    img_rgba = img_rgb.convert("RGBA")
    data = np.array(img_rgba)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    is_bg = (r > threshold) & (g > threshold) & (b > threshold) & (np.abs(r.astype(int) - g.astype(int)) < 15) & (np.abs(g.astype(int) - b.astype(int)) < 15)
    data[:, :, 3] = np.where(is_bg, 0, 255)
    return Image.fromarray(data)

raw_img = Image.open(src_path)
cutout_leopard = cutout_white_background(raw_img, threshold=238)
cutout_leopard = cutout_leopard.resize((320, 320), Image.Resampling.LANCZOS)

out_png1 = r"c:\Coin-Opti\German Bot\bootcamp-app\public\gifs\leopard_static.png"
out_png2 = r"c:\Coin-Opti\German Bot\assets\gifs\leopard_static.png"
cutout_leopard.save(out_png1, "PNG")
cutout_leopard.save(out_png2, "PNG")
print("Saved leopard_static.png")
