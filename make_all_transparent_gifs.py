import os
import shutil
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BRAIN_DIR = r"C:\Users\pkuzo\.gemini\antigravity\brain\c517c35b-7e71-4018-99da-e03b4caf2cc2"
OUTPUT_DIR = r"c:\Coin-Opti\German Bot\bootcamp-app\public\gifs"
ASSETS_DIR = r"c:\Coin-Opti\German Bot\assets"

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

def cutout_background(img_rgb, bg_color_ref=(220, 220, 225), threshold=35):
    """Cut out solid/gradient studio background"""
    img_rgba = img_rgb.convert("RGBA")
    data = np.array(img_rgba)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # Distance from background color
    dist = np.sqrt((r.astype(float) - bg_color_ref[0])**2 + 
                   (g.astype(float) - bg_color_ref[1])**2 + 
                   (b.astype(float) - bg_color_ref[2])**2)
                   
    # Also corner sample background
    corner_val = np.median(data[:20, :20, :3], axis=(0,1))
    dist_corner = np.sqrt((r.astype(float) - corner_val[0])**2 + 
                          (g.astype(float) - corner_val[1])**2 + 
                          (b.astype(float) - corner_val[2])**2)
                          
    is_bg = (dist < threshold) | (dist_corner < threshold)
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

# Make transparent Cow Mom GIF
def make_cow_mom_transparent_gif():
    src_path = os.path.join(BRAIN_DIR, "cow_mom_raw_1786794497729.jpg")
    if not os.path.exists(src_path):
        return
    raw_img = Image.open(src_path)
    cutout_cow_mom = cutout_background(raw_img, bg_color_ref=(225, 225, 230), threshold=30)
    cutout_cow_mom = cutout_cow_mom.resize((340, 340), Image.Resampling.LANCZOS)
    
    frames_rgba = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        dy = int(math.sin(angle_rad) * 6)
        rot = math.sin(angle_rad) * 4
        
        rotated = cutout_cow_mom.rotate(rot, resample=Image.Resampling.NEAREST, expand=False)
        frame.paste(rotated, (20, 35 + dy), rotated)
        
        draw = ImageDraw.Draw(frame)
        if i < 8:
            draw_speech_bubble(draw, "Sehr brav!", (20, 15, 165, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=20)
        else:
            draw_speech_bubble(draw, "Lerne Deutsch!", (20, 15, 195, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=19)
            
        frames_rgba.append(frame)
        
    out1 = os.path.join(OUTPUT_DIR, "cow_mom_cheer.gif")
    out2 = os.path.join(ASSETS_DIR, "gifs", "cow_mom_cheer.gif")
    save_transparent_gif(frames_rgba, [out1, out2], duration=110)
    print("Updated cow_mom_cheer.gif with transparent background")

# Make transparent Leopard Dance GIF
def make_leopard_transparent_gif():
    src_path = os.path.join(BRAIN_DIR, "leopard_raw_1786794729817.jpg")
    if not os.path.exists(src_path):
        return
    raw_img = Image.open(src_path)
    cutout_leopard = cutout_background(raw_img, bg_color_ref=(255, 255, 255), threshold=20)
    cutout_leopard = cutout_leopard.resize((320, 320), Image.Resampling.LANCZOS)
    
    frames_rgba = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        rot = math.sin(angle_rad) * 6
        dy = int(math.sin(angle_rad * 2) * 8)
        dx = int(math.sin(angle_rad) * 5)
        
        rotated = cutout_leopard.rotate(rot, resample=Image.Resampling.NEAREST, expand=False)
        frame.paste(rotated, (30 + dx, 50 + dy), rotated)
        
        draw = ImageDraw.Draw(frame)
        if i < 8:
            draw_speech_bubble(draw, "Wunderbar!", (180, 15, 350, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=20)
        else:
            draw_speech_bubble(draw, "Ausgezeichnet!", (165, 15, 365, 63), bg_color=(255, 255, 255, 255), border_color=(50, 50, 50, 255), text_color=(20, 20, 20, 255), font_size=18)
            
        frames_rgba.append(frame)
        
    out1 = os.path.join(OUTPUT_DIR, "leopard_dance.gif")
    out2 = os.path.join(ASSETS_DIR, "gifs", "leopard_dance.gif")
    save_transparent_gif(frames_rgba, [out1, out2], duration=110)
    print("Updated leopard_dance.gif with transparent background")

if __name__ == "__main__":
    make_cow_mom_transparent_gif()
    make_leopard_transparent_gif()
