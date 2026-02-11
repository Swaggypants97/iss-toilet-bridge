// ISS Toilet Tracker - Lightstreamer Bridge
// Connects to NASA's Lightstreamer feed and exposes NODE3000005 via HTTP

const http = require('http');
const LightstreamerClient = require('lightstreamer-client-node').LightstreamerClient;
const Subscription = require('lightstreamer-client-node').Subscription;

// Store the latest urine tank value
let latestValue = {
  value: "0",
  timestamp: "0",
  lastUpdate: new Date()
};

console.log('[ISS-BRIDGE] Starting ISS Toilet Tracker Bridge...');

// Connect to Lightstreamer
const lsClient = new LightstreamerClient("https://push.lightstreamer.com", "ISSLIVE");
lsClient.connectionOptions.setSlowingEnabled(false);

// Subscribe to NODE3000005 (Urine Tank)
const sub = new Subscription("MERGE", ["NODE3000005"], ["Value", "TimeStamp"]);

lsClient.subscribe(sub);

// Handle connection status
lsClient.addListener({
  onStatusChange: function(status) {
    console.log('[ISS-BRIDGE] Lightstreamer status:', status);
  }
});

// Handle subscription
sub.addListener({
  onSubscription: function() {
    console.log('[ISS-BRIDGE] ✅ Subscribed to NODE3000005 (Urine Tank)');
  },
  onUnsubscription: function() {
    console.log('[ISS-BRIDGE] ⚠️  Unsubscribed from NODE3000005');
  },
  onItemUpdate: function(update) {
    const value = update.getValue("Value");
    const timestamp = update.getValue("TimeStamp");
    
    latestValue = {
      value: value || "0",
      timestamp: timestamp || "0",
      lastUpdate: new Date()
    };
    
    console.log(`[ISS-BRIDGE] 📊 Urine Tank: ${latestValue.value}%`);
  }
});

// Connect to Lightstreamer
lsClient.connect();

// Create HTTP server for ESP8266 to poll
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Handle CORS for browser testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/') {
    // Main endpoint - returns current urine tank level
    res.writeHead(200);
    res.end(JSON.stringify({
      level: parseFloat(latestValue.value) || 0,
      timestamp: latestValue.timestamp,
      lastUpdate: latestValue.lastUpdate.toISOString(),
      status: "ok"
    }));
  } else if (req.url === '/health') {
    // Health check endpoint
    res.writeHead(200);
    res.end(JSON.stringify({ status: "healthy" }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`[ISS-BRIDGE] 🚀 Server running on port ${PORT}`);
  console.log(`[ISS-BRIDGE] 🌐 Endpoint: http://localhost:${PORT}/`);
  console.log(`[ISS-BRIDGE] 📡 Waiting for ISS data...`);
});
