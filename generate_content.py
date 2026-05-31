import os
import json
import argparse
import requests
from openai import OpenAI

def generate_day_content(day_number, topic=None):
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("Error: DEEPSEEK_API_KEY environment variable not set.")
        print("Please set it using: set DEEPSEEK_API_KEY=your_key")
        return

    base_url = "https://api.deepseek.com"
    client = OpenAI(api_key=api_key, base_url=base_url)
    model_name = "deepseek-v4-flash"

    client = OpenAI(
        api_key=api_key,
        base_url=base_url
    )

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
  ]
}}

请生成至少 25 个核心词汇（vocab），5 个听写长句（dictations），以及 3 个语法选择题（grammars）。
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate German Bootcamp content using DeepSeek API")
    parser.add_argument("--day", type=int, help="Single day number to generate (e.g., 29)")
    parser.add_argument("--start", type=int, help="Start day for batch generation (e.g., 3)")
    parser.add_argument("--end", type=int, help="End day for batch generation (e.g., 10)")
    parser.add_argument("--topic", type=str, help="Optional topic for the day")
    
    args = parser.parse_args()
    
    if args.start and args.end:
        for i in range(args.start, args.end + 1):
            generate_day_content(i, args.topic)
    elif args.day:
        generate_day_content(args.day, args.topic)
    else:
        print("Please provide either --day OR both --start and --end arguments.")
        parser.print_help()
