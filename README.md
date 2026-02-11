# ISS Toilet Tracker - Lightstreamer Bridge

This Node.js server connects to NASA's Lightstreamer feed and provides a simple HTTP endpoint for the ESP8266 to fetch ISS urine tank data (NODE3000005).

## How It Works

1. Connects to `https://push.lightstreamer.com` (NASA's ISS telemetry)
2. Subscribes to NODE3000005 (Urine Tank percentage)
3. Exposes data via HTTP endpoint

## API Endpoints

### `GET /`
Returns current urine tank level:
```json
{
  "level": 47.3,
  "timestamp": "36/22:33:31",
  "lastUpdate": "2026-02-11T16:30:00.000Z",
  "status": "ok"
}
```

### `GET /health`
Health check endpoint:
```json
{
  "status": "healthy"
}
```

## Deploy to Render.com

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (or use "Public Git repository")
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Click "Create Web Service"

Your endpoint will be: `https://your-app-name.onrender.com/`

## Testing Locally

```bash
npm install
node server.js
```

Then visit: http://localhost:3000/

## ESP8266 Code

```cpp
HTTPClient http;
http.begin("https://your-app-name.onrender.com/");
int httpCode = http.GET();

if (httpCode == 200) {
  String payload = http.getString();
  // Parse JSON to get "level" value
}
```
