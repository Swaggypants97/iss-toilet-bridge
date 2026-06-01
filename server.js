// ISS Toilet Tracker - Lightstreamer Bridge (with ISS clock)

const http = require('http');
const LightstreamerClient = require('lightstreamer-client-node').LightstreamerClient;
const Subscription = require('lightstreamer-client-node').Subscription;

let latestValue = {
  value: "0",
  timestamp: "0",
  lastUpdate: new Date()
};

let latestISSTime = {
  gmt: "0",
  lastUpdate: new Date()
};

console.log('[ISS-BRIDGE] Starting ISS Toilet Tracker Bridge...');

const lsClient = new LightstreamerClient("https://push.lightstreamer.com", "ISSLIVE");
lsClient.connectionOptions.setSlowingEnabled(false);

// Subscribe to NODE3000005 (Urine Tank)
const subTank = new Subscription("MERGE", ["NODE3000005"], ["Value", "TimeStamp"]);
lsClient.subscribe(subTank);

// Subscribe to TIME_000001 (ISS GMT clock)
const subTime = new Subscription("MERGE", ["TIME_000001"], ["Value", "TimeStamp"]);
lsClient.subscribe(subTime);

lsClient.addListener({
  onStatusChange: function(status) {
    console.log('[ISS-BRIDGE] Lightstreamer status:', status);
  }
});

subTank.addListener({
  onSubscription: function() {
    console.log('[ISS-BRIDGE] ✅ Subscribed to NODE3000005 (Urine Tank)');
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

subTime.addListener({
  onSubscription: function() {
    console.log('[ISS-BRIDGE] ✅ Subscribed to TIME_000001 (ISS GMT)');
  },
  onItemUpdate: function(update) {
    const value = update.getValue("Value");
    latestISSTime = {
      gmt: value || "0",
      lastUpdate: new Date()
    };
    console.log(`[ISS-BRIDGE] 🕐 ISS GMT: ${latestISSTime.gmt}`);
  }
});

lsClient.connect();

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
});
