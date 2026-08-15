import os
import shutil
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BRAIN_DIR = r"C:\Users\pkuzo\.gemini\antigravity\brain\c517c35b-7e71-4018-99da-e03b4caf2cc2"
OUTPUT_DIR = r"c:\Coin-Opti\German Bot\bootcamp-app\public\gifs"
ASSETS_DIR = r"c:\Coin-Opti\German Bot\assets"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "gifs"), exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "images"), exist_ok=True)
os.makedirs(r"c:\Coin-Opti\German Bot\bootcamp-app\public\images", exist_ok=True)

# Copy static image
shutil.copy2(os.path.join(BRAIN_DIR, "niulai_raw_calf_1786794867388.jpg"), 
             os.path.join(ASSETS_DIR, "images", "niulai_raw.jpg"))
shutil.copy2(os.path.join(BRAIN_DIR, "niulai_raw_calf_1786794867388.jpg"), 
             os.path.join(r"c:\Coin-Opti\German Bot\bootcamp-app\public\images", "niulai_raw.jpg"))

def try_get_font(size, bold=False):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\msyh.ttc",
        "arial.ttf"
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except:
                pass
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def draw_speech_bubble(draw, text, box_coords, bg_color=(255, 255, 255, 255), border_color=(40, 40, 40, 255), text_color=(20, 20, 20, 255), font_size=20):
    x1, y1, x2, y2 = box_coords
    draw.rounded_rectangle([x1, y1, x2, y2], radius=14, fill=bg_color, outline=border_color, width=3)
    draw.polygon([(x1 + 25, y2), (x1 + 35, y2 + 15), (x1 + 45, y2)], fill=bg_color, outline=border_color)
    draw.line([(x1 + 27, y2), (x1 + 43, y2)], fill=bg_color, width=3)
    
    font = try_get_font(font_size, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) / 2
    ty = y1 + (y2 - y1 - th) / 2 - 2
    draw.text((tx, ty), text, fill=text_color, font=font)

def cutout_white_background(img_rgb, threshold=240):
    """Accurately removes plain white/off-white background and returns RGBA image with transparent background"""
    img_rgba = img_rgb.convert("RGBA")
    data = np.array(img_rgba)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    is_bg = (r > threshold) & (g > threshold) & (b > threshold) & (np.abs(r.astype(int) - g.astype(int)) < 15) & (np.abs(g.astype(int) - b.astype(int)) < 15)
    data[:, :, 3] = np.where(is_bg, 0, 255)
    return Image.fromarray(data)

def save_transparent_gif(frames_rgba, out_paths, duration=110):
    processed_frames = []
    for frame in frames_rgba:
        alpha = frame.split()[3]
        rgb = frame.convert("RGB")
        p_frame = rgb.convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
        mask = Image.eval(alpha, lambda a: 255 if a < 128 else 0)
        p_frame.paste(255, mask)
        p_frame.info['transparency'] = 255
        p_frame.info['disposal'] = 2
        processed_frames.append(p_frame)
        
    for p in out_paths:
        processed_frames[0].save(
            p,
            save_all=True,
            append_images=processed_frames[1:],
            duration=duration,
            loop=0,
            disposal=2,
            transparency=255,
            optimize=False
        )

# Make transparent Niulai GIF
def make_niulai_transparent_gif():
    src_path = os.path.join(BRAIN_DIR, "niulai_raw_calf_1786794867388.jpg")
    if not os.path.exists(src_path):
        return
    raw_img = Image.open(src_path)
    cutout_niulai = cutout_white_background(raw_img, threshold=238)
    
    # Scale calf character to appropriate proportions
    cutout_niulai = cutout_niulai.resize((310, 310), Image.Resampling.LANCZOS)
    
    frames_rgba = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Bouncing / hopping calf animation + head nod
        dy = int(math.sin(angle_rad) * 7)
        rot = math.sin(angle_rad) * 5
        scale_y = 1.0 + 0.03 * math.sin(angle_rad)
        
        cur_w = int(310)
        cur_h = int(310 * scale_y)
        scaled = cutout_niulai.resize((cur_w, cur_h), Image.Resampling.NEAREST)
        rotated = scaled.rotate(rot, resample=Image.Resampling.NEAREST, expand=False)
        
        frame.paste(rotated, (35, 55 + dy), rotated)
        
        draw = ImageDraw.Draw(frame)
        if i < 8:
            draw_speech_bubble(draw, "Sehr gut!", (20, 15, 160, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=20)
        else:
            draw_speech_bubble(draw, "Super!", (25, 15, 145, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=20)
            
        frames_rgba.append(frame)
        
    out1 = os.path.join(OUTPUT_DIR, "niulai_cheer.gif")
    out2 = os.path.join(ASSETS_DIR, "gifs", "niulai_cheer.gif")
    save_transparent_gif(frames_rgba, [out1, out2], duration=110)
    print("Updated niulai_cheer.gif with transparent background and raw orange calf model")

if __name__ == "__main__":
    make_niulai_transparent_gif()
