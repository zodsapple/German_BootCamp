"""Subset the official OFL fonts to the characters shipped with this app."""

from pathlib import Path
from io import BytesIO
from urllib.request import urlretrieve
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "artifacts/font-sources"
OUTPUT = ROOT / "bootcamp-app/public/fonts"

text = "".join(path.read_text(encoding="utf-8") for path in (ROOT / "bootcamp-app/src").rglob("*") if path.suffix in {".jsx", ".js", ".json", ".css"})
text += (ROOT / "bootcamp-app/public/listen.html").read_text(encoding="utf-8")
text += "普通困难秒题已熟练待巩固复习专项主题学习进度录音准备宣传片快战整关训练开启声音德语宫廷对决来和大橘过两招把语法打成反应扫码开战"
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
for filename, family, upstream in [
    ("NotoSansSC.ttf", "notosanssc", "NotoSansSC%5Bwght%5D.ttf"),
    ("AtkinsonHyperlegibleNext.ttf", "atkinsonhyperlegiblenext", "AtkinsonHyperlegibleNext%5Bwght%5D.ttf"),
]:
    if not (SOURCE / filename).exists():
        urlretrieve(f"https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/{upstream}", SOURCE / filename)
for filename, target, characters in [
    ("NotoSansSC.ttf", "NotoSansSC.woff2", text),
    ("AtkinsonHyperlegibleNext.ttf", "AtkinsonHyperlegibleNext.woff2", "".join(chr(code) for code in range(32, 591))),
]:
    font = TTFont(SOURCE / filename)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=characters)
    subsetter.subset(font)
    font.flavor = "woff2"
    buffer = BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    destination = OUTPUT / target
    if not destination.exists() or destination.read_bytes() != data:
        temporary = destination.with_suffix('.tmp')
        temporary.write_bytes(data)
        temporary.replace(destination)
    print(f"{target}: {(OUTPUT / target).stat().st_size:,} bytes")
