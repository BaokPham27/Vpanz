# import_books.py
import json
import requests
from pykakasi import kakasi

# Cài đặt: pip install pykakasi requests

kakasi_instance = kakasi()
kakasi_instance.setMode("H", "a")  # Hiragana → romanji
kakasi_instance.setMode("K", "a")  # Katakana → romanji
kakasi_instance.setMode("J", "a")  # Kanji → romanji
conv = kakasi_instance.getConverter()

def simple_tokenize(text):
    # Cách đơn giản: tách theo dấu cách + dấu câu
    import re
    tokens = re.findall(r'[\u4e00-\u9fff]+|[\u3040-\u309f]+|[\u30a0-\u30ff]+|[^ \n]+', text)
    result = []
    for t in tokens:
        if any('\u4e00' <= c <= '\u9fff' for c in t):  # có kanji
            reading = conv.do(t)
            result.append({
                "surface": t,
                "reading": reading,
                "base": t,
                "pos": "unknown",
                "meaning": "Chưa có nghĩa"  # sau này dùng từ điển
            })
        else:
            result.append({
                "surface": t,
                "reading": "",
                "base": t,
                "pos": "punctuation",
                "meaning": ""
            })
    return result

# Đọc file sách song ngữ
with open('sach.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

chapters = []
current_chapter = None

for line in lines:
    line = line.strip()
    if line.startswith("CHƯƠNG"):
        if current_chapter:
            chapters.append(current_chapter)
        current_chapter = {
            "chapterNumber": len(chapters) + 1,
            "japaneseText": "",
            "vietnameseText": ""
        }
    elif "「" in line or "」" in line or any(c >= '\u4e00' for c in line):
        current_chapter["japaneseText"] += line + "\n"
    else:
        current_chapter["vietnameseText"] += line + "\n"

if current_chapter:
    chapters.append(current_chapter)

# Gửi lên backend
for chap in chapters:
    tokens = simple_tokenize(chap["japaneseText"])
    data = {
        "bookId": "67a123456789abcdef123456",  # thay bằng ID thật
        "chapterNumber": chap["chapterNumber"],
        "japaneseText": chap["japaneseText"].strip(),
        "vietnameseText": chap["vietnameseText"].strip(),
        "tokens": tokens
    }
    
    r = requests.post("http://localhost:3000/api/admin/import-chapter", json=data)
    print(f"Chương {chap['chapterNumber']}:", r.json())