import os
import shutil
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

BRAIN_DIR = r"C:\Users\pkuzo\.gemini\antigravity\brain\c517c35b-7e71-4018-99da-e03b4caf2cc2"
USER_UPLOAD_DIR = os.path.join(BRAIN_DIR, ".user_uploaded")
OUTPUT_DIR = r"c:\Coin-Opti\German Bot\bootcamp-app\public\gifs"
ASSETS_DIR = r"c:\Coin-Opti\German Bot\assets"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "gifs"), exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "images"), exist_ok=True)

# Copy base images to assets
for img_name in ["cow_mom_mascot_1786794349517.jpg", "niulai_bot_avatar_1786794136083.jpg", 
                 "niulai_crypto_bot_1786794158856.jpg", "niulai_retro_meme_1786794147720.jpg"]:
    src = os.path.join(BRAIN_DIR, img_name)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(ASSETS_DIR, "images", img_name))

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

def draw_speech_bubble(draw, text, box_coords, bg_color=(255, 255, 255), border_color=(40, 40, 40), text_color=(20, 20, 20), font_size=20):
    x1, y1, x2, y2 = box_coords
    draw.rounded_rectangle([x1, y1, x2, y2], radius=14, fill=bg_color, outline=border_color, width=3)
    # triangle tail
    draw.polygon([(x1 + 25, y2), (x1 + 35, y2 + 15), (x1 + 45, y2)], fill=bg_color, outline=border_color)
    # patch seam
    draw.line([(x1 + 27, y2), (x1 + 43, y2)], fill=bg_color, width=3)
    
    font = try_get_font(font_size, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + (x2 - x1 - tw) / 2
    ty = y1 + (y2 - y1 - th) / 2 - 2
    draw.text((tx, ty), text, fill=text_color, font=font)

# 1. Generate niulai_bot_avatar GIF (Bouncing, blinking/nodding & "Sehr gut!" bubble)
def make_niulai_avatar_gif():
    src_path = os.path.join(BRAIN_DIR, "niulai_bot_avatar_1786794136083.jpg")
    if not os.path.exists(src_path):
        return
    base_img = Image.open(src_path).convert("RGBA").resize((380, 380), Image.Resampling.LANCZOS)
    
    frames = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Subtle breathing/bounce
        dy = int(math.sin(angle_rad) * 6)
        scale_x = 1.0 + 0.02 * math.sin(angle_rad)
        scale_y = 1.0 - 0.02 * math.sin(angle_rad)
        
        cur_w = int(380 * scale_x)
        cur_h = int(380 * scale_y)
        scaled = base_img.resize((cur_w, cur_h), Image.Resampling.BILINEAR)
        
        pos_x = (380 - cur_w) // 2
        pos_y = (380 - cur_h) // 2 + dy
        frame.paste(scaled, (pos_x, pos_y), scaled)
        
        # Speech bubble popping up
        draw = ImageDraw.Draw(frame)
        if i % 8 < 4:
            draw_speech_bubble(draw, "Sehr gut!", (20, 20, 160, 68), bg_color=(255, 255, 255, 245), border_color=(245, 166, 35), text_color=(30, 30, 30), font_size=20)
        else:
            draw_speech_bubble(draw, "Super!", (25, 20, 145, 68), bg_color=(255, 255, 255, 245), border_color=(245, 166, 35), text_color=(30, 30, 30), font_size=20)
            
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))
        
    out_file1 = os.path.join(OUTPUT_DIR, "niulai_cheer.gif")
    out_file2 = os.path.join(ASSETS_DIR, "gifs", "niulai_cheer.gif")
    frames[0].save(out_file1, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    frames[0].save(out_file2, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    print("Created niulai_cheer.gif")

# 2. Generate leopard dance / wiggle GIF
def make_leopard_gif():
    src_path = os.path.join(USER_UPLOAD_DIR, "media_1786794053245.png")
    if not os.path.exists(src_path):
        src_path = os.path.join(BRAIN_DIR, "niulai_retro_meme_1786794147720.jpg")
        
    base_img = Image.open(src_path).convert("RGBA").resize((360, 360), Image.Resampling.LANCZOS)
    
    frames = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (360, 360), (25, 45, 30, 255))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Wiggle rotation & bobbing
        rot = math.sin(angle_rad) * 8
        dy = int(math.sin(angle_rad * 2) * 8)
        
        rotated = base_img.rotate(rot, resample=Image.Resampling.BILINEAR, expand=False)
        frame.paste(rotated, (0, dy), rotated)
        
        draw = ImageDraw.Draw(frame)
        draw_speech_bubble(draw, "Wunderbar!", (175, 25, 345, 75), bg_color=(255, 248, 220, 240), border_color=(220, 120, 20), text_color=(40, 20, 0), font_size=20)
        
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))
        
    out_file1 = os.path.join(OUTPUT_DIR, "leopard_dance.gif")
    out_file2 = os.path.join(ASSETS_DIR, "gifs", "leopard_dance.gif")
    frames[0].save(out_file1, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    frames[0].save(out_file2, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    print("Created leopard_dance.gif")

# 3. Generate Cow Mom GIF (牛妈 - 原版粗犷低模风)
def make_cow_mom_gif():
    src_path = os.path.join(BRAIN_DIR, "cow_mom_raw_1786794497729.jpg")
    if not os.path.exists(src_path):
        return
    base_img = Image.open(src_path).convert("RGBA").resize((380, 380), Image.Resampling.LANCZOS)
    
    frames = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (380, 380), (220, 220, 225, 255))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Crude, funny deadpan bobbing & stiff mechanical swaying
        dy = int(math.sin(angle_rad) * 7)
        rot = math.sin(angle_rad) * 4
        
        rotated = base_img.rotate(rot, resample=Image.Resampling.NEAREST, expand=False)
        frame.paste(rotated, (0, dy), rotated)
        
        draw = ImageDraw.Draw(frame)
        if i < 8:
            draw_speech_bubble(draw, "Sehr brav!", (20, 20, 165, 68), bg_color=(255, 255, 255, 240), border_color=(80, 80, 90), text_color=(20, 20, 20), font_size=20)
        else:
            draw_speech_bubble(draw, "Lerne Deutsch!", (20, 20, 195, 68), bg_color=(255, 255, 255, 240), border_color=(80, 80, 90), text_color=(20, 20, 20), font_size=19)
            
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))
        
    out_file1 = os.path.join(OUTPUT_DIR, "cow_mom_cheer.gif")
    out_file2 = os.path.join(ASSETS_DIR, "gifs", "cow_mom_cheer.gif")
    frames[0].save(out_file1, save_all=True, append_images=frames[1:], duration=110, loop=0, optimize=True)
    frames[0].save(out_file2, save_all=True, append_images=frames[1:], duration=110, loop=0, optimize=True)
    print("Updated cow_mom_cheer.gif with clean typography")

# 4. Generate Movie Trio Meme GIF (牛来 + 豹拉 + 牛妈 原片名场面)
def make_movie_trio_gif():
    src_path = os.path.join(USER_UPLOAD_DIR, "media_1786794062636.png")
    if not os.path.exists(src_path):
        return
    base_img = Image.open(src_path).convert("RGBA").resize((480, 360), Image.Resampling.LANCZOS)
    
    frames = []
    num_frames = 16
    for i in range(num_frames):
        frame = Image.new("RGBA", (480, 360), (0, 0, 0, 255))
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Camera slow pan/bobbing
        dy = int(math.sin(angle_rad) * 4)
        dx = int(math.cos(angle_rad) * 3)
        
        frame.paste(base_img, (dx, dy), base_img)
        
        draw = ImageDraw.Draw(frame)
        # German Learning / Meme tagline banner at bottom
        banner_bg = (20, 20, 20, 220)
        draw.rectangle([0, 310, 480, 360], fill=banner_bg)
        
        font = try_get_font(20)
        if i % 8 < 4:
            txt = "🚀 Los geht's! German BootCamp"
        else:
            txt = "🐮 牛来运转 · Deutsch B1 Sprint!"
            
        bbox = draw.textbbox((0, 0), txt, font=font)
        tx = (480 - (bbox[2] - bbox[0])) // 2
        draw.text((tx, 322), txt, fill=(255, 215, 0), font=font)
        
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))
        
    out_file1 = os.path.join(OUTPUT_DIR, "niulai_movie_trio.gif")
    out_file2 = os.path.join(ASSETS_DIR, "gifs", "niulai_movie_trio.gif")
    frames[0].save(out_file1, save_all=True, append_images=frames[1:], duration=120, loop=0, optimize=True)
    frames[0].save(out_file2, save_all=True, append_images=frames[1:], duration=120, loop=0, optimize=True)
    print("Created niulai_movie_trio.gif")

# 5. Generate Cyber Bull Glow Pulse GIF
def make_cyber_bull_gif():
    src_path = os.path.join(BRAIN_DIR, "niulai_crypto_bot_1786794158856.jpg")
    if not os.path.exists(src_path):
        return
    base_img = Image.open(src_path).convert("RGBA").resize((380, 380), Image.Resampling.LANCZOS)
    
    frames = []
    num_frames = 16
    for i in range(num_frames):
        angle_rad = 2 * math.pi * (i / num_frames)
        
        # Pulse brightness and contrast
        factor = 1.0 + 0.25 * math.sin(angle_rad)
        enhancer = ImageEnhance.Brightness(base_img)
        enhanced = enhancer.enhance(factor)
        
        # Subtle zoom
        scale = 1.0 + 0.03 * math.sin(angle_rad)
        cur_w = int(380 * scale)
        cur_h = int(380 * scale)
        scaled = enhanced.resize((cur_w, cur_h), Image.Resampling.BILINEAR)
        
        frame = Image.new("RGBA", (380, 380), (10, 15, 25, 255))
        pos_x = (380 - cur_w) // 2
        pos_y = (380 - cur_h) // 2
        frame.paste(scaled, (pos_x, pos_y), scaled)
        
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))
        
    out_file1 = os.path.join(OUTPUT_DIR, "cyber_bull_pulse.gif")
    out_file2 = os.path.join(ASSETS_DIR, "gifs", "cyber_bull_pulse.gif")
    frames[0].save(out_file1, save_all=True, append_images=frames[1:], duration=90, loop=0, optimize=True)
    frames[0].save(out_file2, save_all=True, append_images=frames[1:], duration=90, loop=0, optimize=True)
    print("Created cyber_bull_pulse.gif")

if __name__ == "__main__":
    make_niulai_avatar_gif()
    make_leopard_gif()
    make_cow_mom_gif()
    make_movie_trio_gif()
    make_cyber_bull_gif()
