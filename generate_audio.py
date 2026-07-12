import os
import json
import argparse
import time
from gtts import gTTS

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def generate_mp3(text, filename):
    if not text or len(text.strip()) == 0:
        return
    if os.path.exists(filename):
        return  # Skip if already exists
    
    # Append a period to prevent gTTS from returning "normal + slow" double pronunciations for single words
    safe_text = text.strip()
    if not safe_text[-1] in ['.', '!', '?', '"', "'"]:
        safe_text += "."

    print(f"Generating {filename}...")
    try:
        tts = gTTS(text=safe_text, lang='de', slow=False)
        tts.save(filename)
        time.sleep(0.5)  # Rate limiting
    except Exception as e:
        print(f"Error generating {filename}: {e}")

def process_day(day_number):
    json_path = os.path.join("bootcamp-app", "src", "data", f"day{day_number}.json")
    if not os.path.exists(json_path):
        print(f"Day {day_number} JSON file not found at {json_path}")
        return

    output_dir = os.path.join("bootcamp-app", "public", "audio", f"day{day_number}")
    ensure_dir(output_dir)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Vocab
    vocab_list = data.get('vocab', [])
    for i, vocab in enumerate(vocab_list):
        # Word
        if 'word' in vocab:
            generate_mp3(vocab['word'], os.path.join(output_dir, f"vocab_{i}_word.mp3"))
        # Example
        if 'example' in vocab:
            generate_mp3(vocab['example'], os.path.join(output_dir, f"vocab_{i}_example.mp3"))

    # 2. Dictations
    dictations = data.get('dictations', data.get('dictation', []))
    if isinstance(dictations, dict):
        dictations = [dictations]
    for i, dictation in enumerate(dictations):
        if 'text' in dictation:
            generate_mp3(dictation['text'], os.path.join(output_dir, f"dictation_{i}.mp3"))

    # 3. Grammars
    grammars = data.get('grammars', data.get('grammar', []))
    if isinstance(grammars, dict):
        grammars = [grammars]
    for i, grammar in enumerate(grammars):
        if 'question' in grammar and 'correct' in grammar:
            # Reconstruct the full sentence
            full_sentence = grammar['question'].replace('___', grammar['correct'])
            generate_mp3(full_sentence, os.path.join(output_dir, f"grammar_{i}.mp3"))

    # 4. Reading
    reading = data.get('reading', None)
    if reading and 'text' in reading:
        generate_mp3(reading['text'], os.path.join(output_dir, "reading.mp3"))

    print(f"Finished generating audio for Day {day_number}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate MP3 files for Bootcamp content using gTTS")
    parser.add_argument("--day", type=int, help="Single day number to generate (e.g., 1)")
    parser.add_argument("--start", type=int, help="Start day for batch generation (e.g., 1)")
    parser.add_argument("--end", type=int, help="End day for batch generation (e.g., 30)")
    
    args = parser.parse_args()
    
    if args.start and args.end:
        for i in range(args.start, args.end + 1):
            process_day(i)
    elif args.day:
        process_day(args.day)
    else:
        print("Please provide either --day OR both --start and --end arguments.")
        parser.print_help()
