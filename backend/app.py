from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import re
from pathlib import Path
import os
import tempfile

app = Flask(__name__)
CORS(app)  # Allow frontend to communicate with backend

# Load Whisper model
print("🔄 Loading Whisper model... This may take a minute...")
model = whisper.load_model("base")  # Using 'base' for faster loading, change to 'small' or 'medium' for better accuracy
print("✅ Whisper model loaded successfully!")

# Sign language dictionary - maps words to sign glosses
SIGN_DICTIONARY = {
    "hello": "HELLO",
    "hi": "HELLO",
    "hey": "HELLO",
    "thank": "THANK-YOU",
    "thanks": "THANK-YOU",
    "you": "YOU",
    "please": "PLEASE",
    "yes": "YES",
    "yeah": "YES",
    "yep": "YES",
    "no": "NO",
    "nope": "NO",
    "how": "HOW",
    "are": "ARE",
    "i": "I",
    "am": "AM",
    "fine": "FINE",
    "good": "GOOD",
    "okay": "GOOD",
    "ok": "GOOD",
    "help": "HELP",
    "sorry": "SORRY",
    "excuse": "EXCUSE",
    "me": "ME",
    "my": "MY",
    "name": "NAME",
    "is": "IS",
}

def clean_text(text):
    """Clean and normalize text"""
    text = text.lower()
    # Remove punctuation but keep spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Remove extra whitespace
    return " ".join(text.split())

def text_to_gloss(text):
    """Convert text to sign language gloss"""
    cleaned = clean_text(text)
    words = cleaned.split()
    
    # Try to find the first recognizable sign
    for word in words:
        if word in SIGN_DICTIONARY:
            return SIGN_DICTIONARY[word]
    
    # If no exact match, try partial matches
    for word in words:
        for key in SIGN_DICTIONARY:
            if key in word or word in key:
                return SIGN_DICTIONARY[key]
    
    return "UNKNOWN"

@app.route("/", methods=["GET"])
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "message": "Voice to Sign Translator API",
        "endpoints": ["/speech-to-sign"],
        "supported_words": list(SIGN_DICTIONARY.keys())
    })

@app.route("/speech-to-sign", methods=["POST"])
def speech_to_sign():
    """Main endpoint for speech to sign translation"""
    try:
        # Check if audio file is in request
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files["audio"]
        
        if audio_file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
        
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            audio_file.save(temp_audio.name)
            temp_path = temp_audio.name
        
        try:
            # Transcribe audio using Whisper
            print(f"🎤 Transcribing audio from: {temp_path}")
            result = model.transcribe(temp_path, language="en")
            transcript = result.get("text", "").strip()
            
            print(f"📝 Transcript: {transcript}")
            
            if not transcript:
                return jsonify({
                    "error": "No speech detected",
                    "transcript": "",
                    "gloss": "UNKNOWN"
                }), 200
            
            # Convert to sign gloss
            gloss = text_to_gloss(transcript)
            print(f"🤟 Sign gloss: {gloss}")
            
            return jsonify({
                "transcript": transcript,
                "gloss": gloss,
                "success": True
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({
            "error": str(e),
            "transcript": "",
            "gloss": "ERROR"
        }), 500

@app.route("/supported-signs", methods=["GET"])
def supported_signs():
    """Get list of supported signs"""
    return jsonify({
        "signs": SIGN_DICTIONARY,
        "count": len(SIGN_DICTIONARY)
    })

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎤 Voice to Sign Translator Backend")
    print("="*60)
    print(f"📚 Supported words: {len(SIGN_DICTIONARY)}")
    print(f"🔊 Whisper model: base")
    print(f"🌐 Server starting on: http://127.0.0.1:5000")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000, host="0.0.0.0")