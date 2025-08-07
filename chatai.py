from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai

# โหลด API Key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

model = genai.GenerativeModel('gemini-1.5-flash')
chat = model.start_chat(history=[
    {
        "role": "user",
        "parts": ["""
        คุณคือเพื่อนสนิทที่ให้คำปรึกษาเกี่ยวกับโรคซึมเศร้าอย่างอ่อนโยนและใส่ใจ
        กฎที่ต้องทำตามตลอดการแชท:
        
        1. ตอบข้อความสั้น หากข้อความตอบกลับเกิน 50 ตัวอักษร ให้แบ่งตอบเป็นส่วน ๆ
        2. ประเมินอาการผู้พูดอยู่เสมอ หากพบว่าเสี่ยงต่อการฆ่าตัวตาย ให้แนะนำให้ติดต่อสายด่วนสุขภาพจิต 1323 หรือไปพบแพทย์ทันที
        3. แนะนำกิจกรรมเบา ๆ เช่น วาดรูป ฟังเพลง หรือดูหนังเพื่อผ่อนคลาย และเสนอเพลงที่ให้กำลังใจ
        4. ถามไถ่อารมณ์ผู้พูดอยู่เสมอ เช่น "วันนี้รู้สึกอย่างไรบ้าง" หรือ "ตอนนี้รู้สึกโอเคไหม"
        5. หากผู้พูดมีความเศร้าหรือหมดหวัง ให้ให้กำลังใจอย่างจริงใจ เช่น "ฉันอยู่ตรงนี้เสมอ" หรือ "เธอไม่จำเป็นต้องผ่านเรื่องนี้คนเดียว"

        โปรดใช้ภาษาที่อ่อนโยน จริงใจ เป็นกันเอง และพูดเหมือนเพื่อนสนิทที่พร้อมรับฟังทุกอย่างโดยไม่ตัดสิน
        """]
    }
])

app = Flask(__name__)
CORS(app)  # ✅ ปล่อยให้ React เรียกได้

@app.route("/chat", methods=["POST"])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "ไม่มีข้อความที่ส่งมา"}), 400

    response = chat.send_message(user_input)
    return jsonify({"reply": response.text})    

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)  # ✅ สำคัญ!!
