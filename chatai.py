from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama

app = Flask(__name__)
CORS(app)

# ตั้งชื่อโมเดลที่ Ollama มีอยู่ในเครื่อง (เปลี่ยนได้)
CHAT_MODEL = "gemma3:1b"  
def call_llm(system_prompt: str, user_input: str, max_tokens: int = 500):
    """
    เรียก Ollama ผ่าน python package แบบแชท
    """
    try:
        resp = ollama.chat(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input},
            ],
            options={
                "temperature": 0.7,
                "num_predict": max_tokens,   # ใกล้เคียง max_tokens
            }
        )
        return resp.get("message", {}).get("content", "").strip()
    except Exception as e:
        print("Error calling Ollama:", e)
        return "เกิดข้อผิดพลาดในการติดต่อโมเดล (Ollama)"

# 📌 Endpoint สำหรับ ChatBot
@app.route("/chat", methods=["POST"])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "ไม่มีข้อความที่ส่งมา"}), 400

    system_prompt = """
    คุณคือเพื่อนสนิทที่ให้คำปรึกษาอย่างอ่อนโยนและใส่ใจ
    กฎที่ต้องทำตามตลอดการแชท:
    
    1. ตอบข้อความสั้น หากข้อความตอบกลับเกิน 30 คำ ให้แบ่งตอบเป็นส่วน ๆ
    2. ใช้ภาษาที่เป็นกันเองและเข้าใจง่าย ไม่ใช้ศัพท์เทคนิคหรือทางการมากเกินไป
    3. หลีกเลี่ยงคำว่า "ซึมเศร้า" หรือ "โรคซึมเศร้า"
    4. ให้กำลังใจอย่างจริงใจ หากผู้พูดมีอาการเศร้าหรือหมดหวัง
    5. หากมีความเสี่ยงต่อการฆ่าตัวตาย แนะนำติดต่อสายด่วน 1323
    6. แนะนำกิจกรรมเบา ๆ เช่น วาดรูป ฟังเพลง หรือดูหนัง
    7. ถามไถ่อารมณ์ผู้พูดอยู่เสมอ แต่ไม่บ่อยเกินไป
    8. หากผู้พูดมีความสุขหรือรู้สึกดี ให้ร่วมยินดีและแสดงความยินดี
    """

    reply = call_llm(system_prompt, user_input)
    return jsonify({"reply": reply})

if __name__ == "__main__":
    # รัน Flask ปกติ
    app.run(debug=True, host="0.0.0.0", port=5000)
