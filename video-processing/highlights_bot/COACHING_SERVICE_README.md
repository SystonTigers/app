# 🤖 AI Coaching Service - Deployment Guide

## Overview

The AI Coaching Service is a FastAPI-based HTTP service that processes coaching analysis requests from your Cloudflare Workers backend. It uses Google Gemini 2.5 Flash to:
- Analyze match videos for tactical mistakes
- Generate progressive training drills
- Create complete training session plans

---

## 🚀 Quick Start

### Option 1: Local Development (Python)

1. **Install Dependencies**
```bash
cd C:\dev\app-FRESH\video-processing\highlights_bot
pip install -r requirements_coaching.txt
```

2. **Set API Key**
```bash
# Windows
setx GEMINI_API_KEY "your-api-key-here"

# Mac/Linux
export GEMINI_API_KEY="your-api-key-here"
```

3. **Run the Service**
```bash
python coaching_service.py

# Or with uvicorn directly:
uvicorn coaching_service:app --reload --port 8000
```

4. **Test It**
```bash
# Health check
curl http://localhost:8000/health

# Test analysis (replace video path)
curl -X POST http://localhost:8000/analyze-mistakes \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-123",
    "video_id": "vid-123",
    "tenant": "syston",
    "team_name": "Syston Town",
    "opponent_name": "Leicester United",
    "video_url": "path/to/video.mp4"
  }'
```

---

### Option 2: Docker Container

1. **Build Image**
```bash
cd C:\dev\app-FRESH\video-processing\highlights_bot
docker build -f Dockerfile.coaching -t coaching-service:latest .
```

2. **Run Container**
```bash
docker run -d \
  -p 8000:8000 \
  -e GEMINI_API_KEY="your-api-key-here" \
  --name coaching-service \
  coaching-service:latest
```

3. **Check Logs**
```bash
docker logs -f coaching-service
```

4. **Stop Container**
```bash
docker stop coaching-service
docker rm coaching-service
```

---

### Option 3: Docker Compose (Recommended for Production)

1. **Create `docker-compose.yml`**
```yaml
version: '3.8'

services:
  coaching-service:
    build:
      context: .
      dockerfile: Dockerfile.coaching
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - CLOUDFLARE_KV_API_URL=${CLOUDFLARE_KV_API_URL}
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
    volumes:
      - ./videos:/app/videos  # Mount video directory
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

2. **Create `.env` File**
```bash
GEMINI_API_KEY=your-gemini-key-here
CLOUDFLARE_KV_API_URL=https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/storage/kv/namespaces/YOUR_NAMESPACE
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

3. **Start Service**
```bash
docker-compose up -d
```

4. **View Logs**
```bash
docker-compose logs -f coaching-service
```

---

## 🔗 Connecting to Cloudflare Workers

Your Cloudflare Workers backend needs to call this service when processing queue messages.

### Update `/backend/src/video-queue-consumer.ts`

Add this handler:

```typescript
async function handleCoachingAnalysis(message: any, env: any) {
  const { jobId, videoId, tenant, team_name, opponent_name, context, r2Key } = message;

  // Get video URL (could be R2 presigned URL or direct download)
  const videoUrl = `https://your-r2-bucket.com/${r2Key}`;

  // Call Python service
  const pythonServiceUrl = env.PYTHON_COACHING_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${pythonServiceUrl}/analyze-mistakes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        video_id: videoId,
        tenant,
        team_name,
        opponent_name,
        context,
        video_url: videoUrl,
        r2_key: r2Key,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Coaching analysis failed: ${data.message}`);
    }

    console.log(`✅ Coaching analysis started: ${jobId}`);
  } catch (error) {
    console.error(`❌ Failed to start coaching analysis:`, error);
    throw error;
  }
}

// In your queue consumer:
export default {
  async queue(batch: MessageBatch<any>, env: any): Promise<void> {
    for (const message of batch.messages) {
      const msg = message.body;

      try {
        if (msg.type === "coaching_analysis") {
          await handleCoachingAnalysis(msg, env);
        } else if (msg.type === "drill_generation") {
          await handleDrillGeneration(msg, env);
        } else if (msg.type === "session_generation") {
          await handleSessionGeneration(msg, env);
        }

        message.ack();
      } catch (error) {
        console.error("Queue message processing failed:", error);
        message.retry();
      }
    }
  }
};
```

### Set Environment Variable in Cloudflare

```bash
# In Cloudflare Workers dashboard:
# Workers & Pages → Your Worker → Settings → Variables

PYTHON_COACHING_SERVICE_URL = http://your-server:8000
```

Or if using Cloudflare Tunnel (recommended):

```bash
PYTHON_COACHING_SERVICE_URL = https://coaching.yourdomain.com
```

---

## 🌐 Production Deployment Options

### Option A: VPS (DigitalOcean, Linode, AWS EC2)

1. **Provision Ubuntu 22.04 Server**
2. **Install Docker & Docker Compose**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose -y
```

3. **Clone Your Repo**
```bash
git clone https://github.com/yourusername/app-FRESH.git
cd app-FRESH/video-processing/highlights_bot
```

4. **Set Environment Variables**
```bash
echo "GEMINI_API_KEY=your-key" > .env
```

5. **Start Service**
```bash
docker-compose up -d
```

6. **Setup Nginx Reverse Proxy** (optional but recommended)
```nginx
server {
    listen 80;
    server_name coaching.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### Option B: Cloudflare Tunnel (Easiest!)

**FREE and Secure - No open ports needed!**

1. **Install Cloudflare Tunnel**
```bash
# On your server (where service runs):
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

2. **Authenticate**
```bash
cloudflared tunnel login
```

3. **Create Tunnel**
```bash
cloudflared tunnel create coaching-service
```

4. **Create Config**
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/user/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: coaching.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

5. **Route DNS**
```bash
cloudflared tunnel route dns coaching-service coaching.yourdomain.com
```

6. **Run Tunnel**
```bash
cloudflared tunnel run coaching-service
```

Now your service is accessible at `https://coaching.yourdomain.com` (with automatic SSL!)

---

### Option C: Serverless (Google Cloud Run / AWS Lambda)

**Cloud Run (Recommended for Gemini Users)**

1. **Build & Push Image**
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/coaching-service
```

2. **Deploy**
```bash
gcloud run deploy coaching-service \
  --image gcr.io/YOUR_PROJECT/coaching-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key
```

3. **Get URL**
```bash
gcloud run services describe coaching-service --format='value(status.url)'
```

---

## 📊 Monitoring & Logs

### Check Service Status
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "components": {
    "mistake_detector": true,
    "drill_generator": true,
    "gemini_api_key": true,
    "cloudflare_kv": true
  }
}
```

### View Logs (Docker)
```bash
docker logs -f coaching-service
```

### View Logs (Docker Compose)
```bash
docker-compose logs -f
```

---

## 🧪 Testing

### Test Mistake Analysis
```bash
curl -X POST http://localhost:8000/analyze-mistakes \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-123",
    "video_id": "vid-123",
    "tenant": "syston",
    "team_name": "Syston Town",
    "opponent_name": "Leicester United",
    "context": {"goals_conceded": 3, "final_score": "2-3"},
    "video_url": "/path/to/test-match.mp4"
  }'
```

### Test Drill Generation
```bash
curl -X POST http://localhost:8000/generate-drills \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "drills-123",
    "tenant": "syston",
    "mistake_data": [
      {
        "category": "defensive_errors",
        "description": "Poor marking on corners",
        "impact": "High"
      }
    ],
    "num_drills": 3,
    "age_group": "Adult",
    "skill_level": "Intermediate"
  }'
```

---

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check if Gemini API key is set
echo $GEMINI_API_KEY

# Check Python version (needs 3.9+)
python --version

# Reinstall dependencies
pip install -r requirements_coaching.txt --force-reinstall
```

### AI Analysis Fails
```bash
# Check Gemini API quota
curl https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY

# Check video file exists and is readable
ls -lh /path/to/video.mp4
```

### Connection Issues from Cloudflare Workers
```bash
# Test from command line
curl http://your-server:8000/health

# Check firewall allows port 8000
sudo ufw status
sudo ufw allow 8000

# Check service is listening
netstat -tlnp | grep 8000
```

---

## 💰 Cost Optimization

### Free Tier (Gemini)
- 1,500 requests/day
- 1M tokens/day
- Perfect for 1-2 matches/week

### Paid Usage
- **Full match analysis**: ~500K tokens = **$0.04**
- **10 matches/month**: **$0.40/month**
- **100 matches/year**: **$4/year**

### Server Costs
- **Local (Free)**: Run on your own computer
- **VPS ($5/mo)**: DigitalOcean Droplet, Linode, etc.
- **Cloudflare Tunnel (Free!)**: Secure tunnel from home/office
- **Cloud Run (Pay-per-use)**: ~$0.05 per match (includes compute)

**Recommended**: Cloudflare Tunnel + Home Server = **$0 server cost!**

---

## 🎯 Next Steps

1. ✅ Start service locally
2. ✅ Test with sample match footage
3. ✅ Connect Cloudflare Workers
4. ⏳ Deploy to production (VPS or Cloud Run)
5. ⏳ Setup Cloudflare Tunnel (if using home server)
6. ⏳ Monitor logs and performance

---

## 📚 API Documentation

Once running, visit:
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🆘 Support

If you encounter issues:
1. Check logs: `docker logs -f coaching-service`
2. Verify API key: `echo $GEMINI_API_KEY`
3. Test health: `curl http://localhost:8000/health`
4. Check Gemini quota: Visit Google AI Studio

**Your AI coaching assistant is ready to deploy!** 🚀
