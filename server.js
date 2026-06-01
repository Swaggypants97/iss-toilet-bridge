// ISS Toilet Tracker - Lightstreamer Bridge (with ISS clock + field dump)
// Connects to NASA's Lightstreamer feed and exposes NODE3000005 + TIME_000001 via HTTP

const http = require('http');
const LightstreamerClient = require('lightstreamer-client-node').LightstreamerClient;
const Subscription = require('lightstreamer-client-node').Subscription;

// Store the latest urine tank value
let latestValue = {
  value: "0",
  timestamp: "0",
  lastUpdate: new Date()
};

// Store the latest ISS time data (all fields, for inspection)
let latestISSTime = {
  gmt: "0",
  raw: {},
  lastUpdate: new Date()
};

console.log('[ISS-BRIDGE] Starting ISS Toilet Tracker Bridge...');

// Connect to Lightstreamer
const lsClient = new LightstreamerClient("https://push.lightstreamer.com", "ISSLIVE");
lsClient.connectionOptions.setSlowingEnabled(false);

// Subscribe to NODE3000005 (Urine Tank)
const subTank = new Subscription("MERGE", ["NODE3000005"], ["Value", "TimeStamp"]);
lsClient.subscribe(subTank);

// Subscribe to TIME_000001 (ISS GMT clock) - subscribe to multiple possible field names
const subTime = new Subscription(
  "MERGE",
  ["TIME_000001"],
  ["Value", "TimeStamp", "GMT", "Time", "Status.Class", "Status.Indicator"]
);
lsClient.subscribe(subTime);

// Handle connection status
lsClient.addListener({
  onStatusChange: function(status) {
    console.log('[ISS-BRIDGE] Lightstreamer status:', status);
  }
});

// Handle NODE3000005 (urine tank) updates
subTank.addListener({
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

// Handle TIME_000001 (ISS GMT) updates - log all fields to figure out which one we want
subTime.addListener({
  onSubscription: function() {
    console.log('[ISS-BRIDGE] ✅ Subscribed to TIME_000001 (ISS GMT)');
  },
  onUnsubscription: function() {
    console.log('[ISS-BRIDGE] ⚠️  Unsubscribed from TIME_000001');
  },
  onItemUpdate: function(update) {
    const value     = update.getValue("Value");
    const timestamp = update.getValue("TimeStamp");
    const gmt       = update.getValue("GMT");
    const time      = update.getValue("Time");

    console.log(
      `[ISS-BRIDGE] 🕐 ISS TIME fields:` +
      ` Value=${value}` +
      ` TimeStamp=${timestamp}` +
      ` GMT=${gmt}` +
      ` Time=${time}`
    );

    latestISSTime = {
      gmt: gmt || time || value || "0",
      raw: { value, timestamp, gmt, time },
      lastUpdate: new Date()
    };
  }
});

// Connect to Lightstreamer
lsClient.connect();

// Create HTTP server for ESP8266 to poll
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      level: parseFloat(latestValue.value) || 0,
      timestamp: latestValue.timestamp,
      lastUpdate: latestValue.lastUpdate.toISOString(),
      issGmt: latestISSTime.gmt,
      issGmtRaw: latestISSTime.raw,
      issGmtFetched: latestISSTime.lastUpdate.toISOString(),
      status: "ok"
    }));
  } else if (req.url === '/health') {
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
