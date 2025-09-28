from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama

app = Flask(__name__)
CORS(app)

# ตั้งชื่อโมเดลที่ Ollama มีอยู่ในเครื่อง (เปลี่ยนได้)
CHAT_MODEL = "llama3.1"  # ลองเป็น "qwen2.5" หรือ "mistral" ก็ได้

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
    5. ประเมินอาการผู้พูดอยู่เสมอ หากมีความเสี่ยงต่อการฆ่าตัวตาย แนะนำติดต่อสายด่วน 1323
    6. แนะนำกิจกรรมเบา ๆ เช่น วาดรูป ฟังเพลง หรือดูหนัง
    7. ถามไถ่อารมณ์ผู้พูดอยู่เสมอ แต่ไม่บ่อยเกินไป
    8. หากผู้พูดมีความสุขหรือรู้สึกดี ให้ร่วมยินดีและแสดงความยินดี
    """

    reply = call_llm(system_prompt, user_input)
    return jsonify({"reply": reply})

# 📌 Endpoint สำหรับ Diary (วิเคราะห์อารมณ์ + ความเสี่ยง)
@app.route("/diary", methods=["POST"])
def diary_endpoint():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "ไม่มีข้อความที่ส่งมา"}), 400

    # 🔹 ตรวจสอบ keyword ความเสี่ยงสูง
    high_risk_keywords = ["อยากตาย", "ฆ่า", "ไม่อยากอยู่", "หมดหวัง", "เจ็บปวด", "ทำร้ายตัวเอง"]
    if any(word in user_input for word in high_risk_keywords):
        risk_level = "เสี่ยงสูง"
    else:
        risk_prompt = f"""
        ข้อความ: "{user_input}"
        ประเมินความเสี่ยงด้านสุขภาพจิตรุนแรงของข้อความนี้
        ตอบเพียงคำเดียว: "เสี่ยงสูง", "เสี่ยงต่ำ" หรือ "ปกติ"
        """
        risk_level = call_llm("คุณเป็นผู้ช่วยวิเคราะห์ความเสี่ยงข้อความ", risk_prompt).strip()

    # 🔹 วิเคราะห์อารมณ์
    emotion_prompt = f"""
    ข้อความจากบันทึก: "{user_input}"
    วิเคราะห์อารมณ์และความรู้สึกของข้อความนี้ และตอบเพียงคำเดียว
    เลือกจาก:'อารมณ์แย่มาก', 'อารมณ์แย่', 'ปกติ', 'อารมณ์ดี', 'อารมณ์ดีมาก'
    """
    emotion = call_llm("คุณเป็นผู้ช่วยวิเคราะห์อารมณ์ข้อความ", emotion_prompt).strip()

    return jsonify({
        "risk": risk_level,
        "emotion": emotion
    })



# 📌 แนะนำกิจกรรมและแจ้งเตือนหน้า app
@app.route("/pont", methods=["POST"])
def pont_endpoint():  # ← เปลี่ยนชื่อฟังก์ชันให้ไม่ซ้ำ
    data = request.get_json(silent=True) or {}

    # รับคะแนนจากฟรอนต์ (0–5) และแปลงเป็น float
    try:
        score = float(data.get("message"))
    except (TypeError, ValueError):
        return jsonify({"error": "คะแนนต้องเป็นตัวเลข 0–5"}), 400

    # ป้องกันค่าเกินช่วง
    score = max(0.0, min(5.0, score))

    system_prompt = f"""
คุณเป็นผู้ช่วยที่จะแนะนำกิจกรรมตามระดับคะแนนอารมณ์ของผู้ใช้ (0-5):

กติกา:
- ผู้ใช้จะส่งคะแนนอารมณ์มาให้ (0 = แย่มาก, 5 = ดีมากที่สุด)
- ให้คุณเลือกกิจกรรมที่เหมาะสมที่สุดตามช่วงคะแนนด้านล่าง
- ตอบสั้น กระชับ ใช้ภาษาที่ให้กำลังใจ

📊 ช่วงคะแนนและกิจกรรมแนะนำ:
0-1: กิจกรรมที่ช่วยผ่อนคลาย เช่น การทำสมาธิ, ฟังเพลงเบาๆ, เดินเล่นในธรรมชาติ
1.1-2: กิจกรรมที่ช่วยเพิ่มพลัง เช่น ออกกำลังกายเบาๆ, โยคะ, วาดรูป
2.1-3: กิจกรรมที่ช่วยสร้างความสุข เช่น ดูหนังตลก, พบปะเพื่อนฝูง, ทำอาหารที่ชอบ
3.1-4: กิจกรรมที่ช่วยเสริมสร้างความมั่นใจ เช่น ตั้งเป้าหมายเล็กๆ, เรียนรู้สิ่งใหม่ๆ, ทำงานอาสาสมัคร
4.1-5: กิจกรรมที่ช่วยเสริมสร้างความสัมพันธ์ เช่น ใช้เวลากับครอบครัว, ทำกิจกรรมกับเพื่อน, แสดงความขอบคุณต่อผู้อื่น

ตอนนี้คะแนนอารมณ์ของผู้ใช้คือ {score}

👉 โปรดเลือกกิจกรรมที่เหมาะสมที่สุด 1-2 กิจกรรม พร้อมข้อความให้กำลังใจสั้นๆ และเพลงที่ให้กำลังใจตามคะแนนที่ได้
"""
    # ส่งคะแนนไปเป็น user_input ด้วยเพื่อช่วย context
    reply = call_llm(system_prompt, f"คะแนนอารมณ์เฉลี่ยของผู้ใช้คือ {score}")
    return jsonify({"reply": reply})



if __name__ == "__main__":
    # รัน Flask ปกติ
    app.run(debug=True, host="0.0.0.0", port=5000)
