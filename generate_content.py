import os
import json
import argparse

from openai import OpenAI

def get_client_and_model():
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if api_key:
        return OpenAI(api_key=api_key, base_url="https://api.deepseek.com"), "deepseek-v4-flash"
        
    print("Error: Neither OPENAI_API_KEY nor DEEPSEEK_API_KEY environment variable is set.")
    return None, None

def generate_day_content(day_number, topic=None):
    client, model_name = get_client_and_model()
    if not client: return

    prompt = f"""
你是一位资深的德语B1级别教师。请为德语B1冲刺特训营的第 {day_number} 天生成学习内容。
{f'今天的主题是：{topic}' if topic else '请选择一个与B1级别相关的核心语法或词汇主题。'}

你必须且只能返回一个JSON对象，并且该对象必须严格符合以下结构：
{{
  "day": {day_number},
  "title": "标题（德语和中文对照）",
  "focus": "用中文简短描述今天的学习重点",
  "vocab": [
    {{
      "word": "德语单词或短语",
      "gender": "词性（如 der/die/das/verb/adj/adv 等）",
      "plural": "名词复数形式或动词过去式/完成式",
      "translation": "中文翻译",
      "example": "德文例句",
      "example_zh": "德文例句的中文翻译",
      "grammar_hint": "该例句的简短语法点提示（如动词位置、格的变化、时态等）",
      "category": "分类（如 名词/动词/形容词/反身动词 等）"
    }}
  ],
  "dictations": [
    {{
      "text": "用于听写练习的德文句子",
      "translation": "中文翻译",
      "hint": "用中文写出的语法或词汇提示"
    }}
  ],
  "grammars": [
    {{
      "question": "带有填空下划线 ___ 的德文题目句子",
      "options": ["选项 A", "选项 B", "选项 C", "选项 D"],
      "correct": "正确的选项",
      "explanation": "用中文解释为什么选这个答案"
    }}
  ],
  "reading": {{
    "text": "与今天主题相关的一段德语阅读理解（大约100词，词汇不超过B2级别）",
    "translation": "中文翻译",
    "grammar": "详尽的重点语法讲解（中文）。请写得非常详细，篇幅要求是普通的3倍，深度剖析句子结构，列出文本中出现的所有 B1 核心语法点（如被动语态、虚拟式、带 zu 的不定式、反身动词、从句等）。\n注意排版要求：必须使用 `\\n` 换行符让每个语法点单独成行。并且使用 Markdown 的 `**` 将语法重点词汇加粗（如 `**被动语态**`）。",
    "vocab": "详尽的重点词汇讲解（中文）。请写得非常详细，篇幅要求是普通的3倍，必须列出文章中出现的所有超出 A1 级别（即 A2 和 B1 级别）的单词。每个单词写明词性、词义、级别，以及相关的固定搭配或词根拆解分析。\n注意排版要求：必须使用 `\\n` 换行符让每个重点词汇单独成行。并且使用 Markdown 的 `**` 将德语单词加粗（如 `**der Alltag**`）。"
  }}
}}

请生成至少 25 个核心词汇（vocab），5 个听写长句（dictations），3 个语法选择题（grammars），以及 1 篇阅读理解（reading）。
"""

    print(f"Generating content for Day {day_number}...")
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个有用的助手，且只输出合法的JSON格式数据。"},
                {"role": "user", "content": prompt}
            ],
            response_format={
                'type': 'json_object'
            }
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        output_dir = os.path.join("bootcamp-app", "src", "data")
        os.makedirs(output_dir, exist_ok=True)
        
        output_path = os.path.join(output_dir, f"day{day_number}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully generated and saved content to {output_path}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

def update_day_content(day_number):
    client, model_name = get_client_and_model()
    if not client: return
    
    output_dir = os.path.join("bootcamp-app", "src", "data")
    file_path = os.path.join(output_dir, f"day{day_number}.json")
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    prompt = f"""
请你处理以下JSON数据（德语B1学习材料）。
任务：
1. 遍历 JSON 中 `vocab` 列表的每一个单词对象，确保它有 `example_zh` 和 `grammar_hint` 两个字段。如果没有，请为它增加这两个新的字段：
   - `example_zh`: 为德文 `example` 句子提供准确的中文翻译。
   - `grammar_hint`: 为该例句提供一个非常简短的语法点提示（比如动词位置、格的变化、时态等）。
2. 检查 JSON 中是否已经存在 `reading` 对象。如果没有，请在根部增加一个 `reading` 对象。该阅读文本必须与当天的学习主题（title 和 focus）紧密相关，包含以下字段：
   - `text`: 一段德文阅读理解（大约100词，词汇不超过B2级别）。
   - `translation`: 中文翻译。
   - `grammar`: 详尽的重点语法讲解（中文）。请写得非常详细，篇幅要求是普通的3倍，深度剖析句子结构，列出文本中出现的所有 B1 核心语法点（如被动语态、虚拟式、带 zu 的不定式、反身动词、从句等）。注意排版要求：必须使用 `\\n` 换行符让每个语法点单独成行，并且使用 Markdown 的 `**` 将语法重点词汇加粗。
   - `vocab`: 详尽的重点词汇讲解（中文）。请写得非常详细，篇幅要求是普通的3倍，必须列出文章中出现的所有超出 A1 级别（即 A2 和 B1 级别）的单词。每个单词写明词性、词义、级别，以及相关的固定搭配或词根拆解分析。注意排版要求：必须使用 `\\n` 换行符让每个重点词汇单独成行，并且使用 Markdown 的 `**` 将德语单词加粗。

请保持原有的所有数据结构和字段不变，仅追加或补全缺失的字段。
返回完整的、合法的JSON格式对象。

JSON 数据：
{json.dumps(data, ensure_ascii=False)}
"""

    print(f"Updating content for Day {day_number}...")
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个有用的助手，且只输出合法的JSON格式数据。"},
                {"role": "user", "content": prompt}
            ],
            response_format={
                'type': 'json_object'
            }
        )
        content = response.choices[0].message.content
        updated_data = json.loads(content)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully updated and saved content to {file_path}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate or Update German Bootcamp content using OpenAI API")
    parser.add_argument("--day", type=int, help="Single day number to generate or update (e.g., 29)")
    parser.add_argument("--start", type=int, help="Start day for batch generation/update (e.g., 3)")
    parser.add_argument("--end", type=int, help="End day for batch generation/update (e.g., 10)")
    parser.add_argument("--topic", type=str, help="Optional topic for the day")
    parser.add_argument("--update", action="store_true", help="Update existing file instead of generating new one")
    
    args = parser.parse_args()
    
    if args.start and args.end:
        for i in range(args.start, args.end + 1):
            if args.update:
                update_day_content(i)
            else:
                generate_day_content(i, args.topic)
    elif args.day:
        if args.update:
            update_day_content(args.day)
        else:
            generate_day_content(args.day, args.topic)
    else:
        print("Please provide either --day OR both --start and --end arguments.")
        parser.print_help()
