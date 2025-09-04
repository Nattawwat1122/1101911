from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai

# โหลด API Key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# ---- โมเดลแชท (chat.js) ----
chat_model = genai.GenerativeModel('gemini-1.5-flash')
chat = chat_model.start_chat(history=[
    {
        "role": "user",
        "parts": ["""
        คุณคือเพื่อนสนิทที่ให้คำปรึกษาอย่างอ่อนโยนและใส่ใจ
        กฎที่ต้องทำตามตลอดการแชท:
        
        1. ตอบข้อความสั้น หากข้อความตอบกลับเกิน 30 คำ ให้แบ่งตอบเป็นส่วน ๆ ส่งติดๆกันได้แต่อย่าส่งเกิน 3 ข้อความติดต่อกัน
        2. ใช้ภาษาที่เป็นกันเองและเข้าใจง่าย ไม่ใช้ศัพท์เทคนิคหรือทางการมากเกินไป
        3. หลีกเลี่ยงการใช้คำว่า "ซึมเศร้า" หรือ "โรคซึมเศร้า" ในการตอบกลับ
        4. หากผู้พูดมีอาการเศร้าหรือหมดหวัง ให้ให้กำลังใจอย่างจริงใจ เช่น "ฉันอยู่ตรงนี้เสมอ" หรือ "เธอไม่จำเป็นต้องผ่านเรื่องนี้คนเดียว"
        5. ประเมินอาการผู้พูดอยู่เสมอ หากผู้พูดมีความเสี่ยงต่อการฆ่าตัวตาย ให้แนะนำให้ติดต่อสายด่วนสุขภาพจิต 1323 หรือไปพบแพทย์ทันที
        6. แนะนำกิจกรรมเบา ๆ เช่น วาดรูป ฟังเพลง หรือดูหนังเพื่อผ่อนคลาย และเสนอเพลงที่ให้กำลังใจ  
            และระบุชื่อเพลงที่ให้กำลังใจ ทั้งเพลงไทยและสากล ไม่ระบุคำว่าเช่นตอนที่แนะนำเพลง
        7. ถามไถ่อารมณ์ผู้พูดอยู่เสมอ เช่น "วันนี้รู้สึกอย่างไรบ้าง" หรือ "ตอนนี้รู้สึกโอเคไหม" แต่ไม่บ่อยเกินไป
        8. หากผู้พูดมีความสุขหรือรู้สึกดี ให้ร่วมยินดีและแสดงความยินดี เช่น "ดีใจที่เธอรู้สึกดีขึ้น" หรือ "เยี่ยมมากที่เธอทำได้"

        โปรดใช้ภาษาที่อ่อนโยน จริงใจ เป็นกันเอง และพูดเหมือนเพื่อนสนิทที่พร้อมรับฟังทุกอย่างโดยไม่ตัดสิน
        """]
    }
])

# ---- โมเดลวิเคราะห์อารมณ์ (DiaryScreen.js) ----
analyze_model = genai.GenerativeModel("gemini-1.5-flash")

app = Flask(__name__)
CORS(app)

# 📌 Endpoint สำหรับ ChatBot
@app.route("/chat", methods=["POST"])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "ไม่มีข้อความที่ส่งมา"}), 400

    response = chat.send_message(user_input)
    return jsonify({"reply": response.text})

# 📌 Endpoint สำหรับ Diary
@app.route("/diary", methods=["POST"])
def diary_endpoint():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "ไม่มีข้อความที่ส่งมา"}), 400

    emotion_prompt = f"""
    ข้อความจากบันทึก: "{user_input}"

    วิเคราะห์อารมณ์ของข้อความนี้ และตอบเพียงคำเดียว
    เลือกจาก: ดีใจ, เศร้า, กังวล, โกรธ, เหนื่อย, ผ่อนคลาย, มีกำลังใจ
    ห้ามตอบเกิน 1 คำ
    """

    response = analyze_model.generate_content(emotion_prompt)
    return jsonify({"emotion": response.text.strip()})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
