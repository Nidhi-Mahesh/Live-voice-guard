# 🎙️ Real Voice Embedding Integration Guide

This guide walks you through setting up **real voice biometric authentication** using SpeechBrain's ECAPA-TDNN model.

---

## 📊 Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Next.js App    │         │  Python Service  │         │   Turso DB  │
│  (Port 3001)    │────────▶│  (Port 8000)     │         │             │
│                 │  Audio  │                  │         │             │
│  - Records mic  │  Blob   │  - SpeechBrain   │         │  - Stores   │
│  - Sends audio  │────────▶│  - Extracts 192D │────────▶│    embeddings│
│  - Gets vector  │◀────────│    embedding     │         │             │
└─────────────────┘  JSON   └──────────────────┘         └─────────────┘
```

---

## 🚀 Step-by-Step Setup

### **Step 1: Install Python (if not already installed)**

Download Python 3.10+ from [python.org](https://www.python.org/downloads/)

Verify installation:
```powershell
python --version
# Should show Python 3.10.x or higher
```

---

### **Step 2: Set Up Voice Embedding Service**

#### 2.1 Navigate to the service directory
```powershell
cd d:\bms\trial1\voice-embedding-service
```

#### 2.2 Create and activate virtual environment
```powershell
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# You should see (venv) in your prompt
```

#### 2.3 Install dependencies
```powershell
pip install -r requirements.txt
```

**⏱️ This will take 5-10 minutes** as it downloads:
- PyTorch (~800MB)
- SpeechBrain (~200MB)
- Other dependencies

#### 2.4 Start the service
```powershell
python app.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Loading SpeechBrain ECAPA-TDNN model...
INFO:     ✅ Model loaded successfully!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**🎉 The service is now running!** Keep this terminal open.

---

### **Step 3: Test the Voice Service**

Open a **new PowerShell window** and test:

```powershell
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","model_loaded":true,"embedding_dimension":192}
```

---

### **Step 4: Start Your Next.js App**

In another terminal:

```powershell
cd d:\bms\trial1\Live-voice-guard
npm run dev
```

The app will start on **http://localhost:3001**

---

### **Step 5: Test End-to-End Enrollment**

1. Open **http://localhost:3001/livevoice-guard/enroll**
2. Fill in:
   - **Name**: Your name
   - **Email**: Your email
3. Click the **microphone button** and read the challenge phrase
4. Click again to stop recording

**What happens:**
1. ✅ Audio recorded in browser (WebM format)
2. ✅ Sent to Python service at `localhost:8000`
3. ✅ SpeechBrain extracts **192-dimensional embedding**
4. ✅ Embedding stored in Turso database
5. ✅ Success message displayed

---

## 🔍 Verify Real Embeddings Are Being Used

### Check the Python service logs

You should see:
```
INFO:     Processing audio file: recording.webm (45678 bytes)
INFO:     Audio duration: 3.45s
```

### Check browser console

Open DevTools (F12) → Console. You should see:
```
Enrollment error: (none - success!)
```

### Check database

The `voice_embedding` field in Turso will contain a **192-element array** (not random values):
```json
"[0.234, -0.567, 0.123, ..., 0.789]"  // 192 real numbers
```

---

## 🎯 What Changed

### Before (Mock)
```typescript
// Generated random 512D vector
function generateVoiceEmbedding(): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < 512; i++) {
    embedding.push((Math.random() * 2 - 1) * 0.8);
  }
  return embedding;
}
```

### After (Real)
```typescript
// Extract real 192D embedding from audio
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');

const embeddingResponse = await fetch('http://localhost:8000/extract-embedding', {
  method: 'POST',
  body: formData,
});

const embeddingData = await embeddingResponse.json();
const voiceEmbedding = embeddingData.embedding; // Real 192D vector!
```

---

## 📝 Model Information

| Property | Value |
|----------|-------|
| **Model** | SpeechBrain ECAPA-TDNN |
| **Training Data** | VoxCeleb 1 & 2 (7000+ speakers) |
| **Embedding Dimension** | 192 |
| **Input** | 16kHz mono audio |
| **Performance** | State-of-the-art speaker verification |
| **Use Case** | Speaker identification & verification |

---

## 🛠️ Troubleshooting

### Issue: Python service won't start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```powershell
# Make sure venv is activated (you should see (venv) in prompt)
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt
```

---

### Issue: Model download fails

**Error:** `Failed to download model`

**Solution:**
- Check internet connection
- The model (~80MB) downloads on first run
- Try again - it will resume from where it stopped

---

### Issue: CORS error in browser

**Error:** `Access to fetch at 'http://localhost:8000' has been blocked by CORS`

**Solution:**
The Python service already has CORS configured for `localhost:3000` and `localhost:3001`. If you're using a different port, update `app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:YOUR_PORT"],
    ...
)
```

---

### Issue: Audio format not supported

**Error:** `Unsupported file type: .webm`

**Solution:**
Install ffmpeg for better audio format support:

```powershell
# Using Chocolatey (if installed)
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

---

### Issue: Enrollment fails with "Database insert failed"

**Solution:**
The embedding dimension changed from 512 to 192. The API now accepts both. If you still see errors, check:

1. Python service is running (`http://localhost:8000/health`)
2. Browser console for detailed error messages
3. Python service terminal for logs

---

## 🚀 Production Deployment

### Option 1: Docker (Recommended)

Create `Dockerfile` in `voice-embedding-service/`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t voice-embedding-service .
docker run -p 8000:8000 voice-embedding-service
```

### Option 2: Cloud Deployment

Deploy to:
- **Railway**: Easy Python deployment
- **Render**: Free tier available
- **Fly.io**: Global edge deployment
- **AWS Lambda**: Serverless (with container support)

Update your Next.js app to use the production URL:
```typescript
const embeddingResponse = await fetch('https://your-service.railway.app/extract-embedding', {
  method: 'POST',
  body: formData,
});
```

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **First request** | ~2-3s (model loading) |
| **Subsequent requests** | ~100-300ms per audio |
| **Memory usage** | ~500MB (model in RAM) |
| **CPU usage** | Moderate (use GPU for faster processing) |

### Enable GPU acceleration (optional)

If you have an NVIDIA GPU:

1. Install CUDA toolkit
2. Install PyTorch with CUDA:
   ```powershell
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```
3. Update `app.py`:
   ```python
   model = EncoderClassifier.from_hparams(
       source="speechbrain/spkrec-ecapa-voxceleb",
       savedir="pretrained_models/spkrec-ecapa-voxceleb",
       run_opts={"device": "cuda"}  # Changed from "cpu"
   )
   ```

---

## ✅ Next Steps

1. ✅ **Test enrollment** with real voice
2. ✅ **Implement verification** (compare embeddings)
3. ✅ **Add anti-spoofing** (detect replayed audio)
4. ✅ **Deploy to production**

---

## 🎓 Understanding Voice Embeddings

### What is a voice embedding?

A **voice embedding** is a compact numerical representation (vector) of someone's voice characteristics:

- **Dimension**: 192 numbers (floats between -1 and 1)
- **Captures**: Pitch, tone, accent, speaking style, vocal tract shape
- **Property**: Similar voices → similar embeddings (high cosine similarity)
- **Use**: Compare two embeddings to verify if they're the same speaker

### Example:

```json
{
  "speaker_A_embedding": [0.23, -0.45, 0.12, ..., 0.78],  // 192 numbers
  "speaker_B_embedding": [0.21, -0.43, 0.15, ..., 0.76],  // 192 numbers
  "similarity": 0.92  // High = same speaker
}
```

---

## 📚 Additional Resources

- [SpeechBrain Documentation](https://speechbrain.github.io/)
- [ECAPA-TDNN Paper](https://arxiv.org/abs/2005.07143)
- [VoxCeleb Dataset](https://www.robots.ox.ac.uk/~vgg/data/voxceleb/)
- [Speaker Verification Tutorial](https://speechbrain.github.io/tutorial_speaker_recognition.html)

---

## 🆘 Need Help?

If you encounter issues:

1. Check Python service logs (terminal where `python app.py` is running)
2. Check browser console (F12 → Console)
3. Check Next.js dev server logs
4. Verify both services are running (`localhost:8000` and `localhost:3001`)

---

**🎉 Congratulations!** You now have **real voice biometric authentication** powered by state-of-the-art deep learning models!
