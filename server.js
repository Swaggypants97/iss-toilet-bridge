// ISS Toilet Tracker - Lightstreamer Bridge
// Decodes NASA's TimeStamp (hours since Jan 1 00:00 UTC) into a real ISO datetime

const http = require('http');
const LightstreamerClient = require('lightstreamer-client-node').LightstreamerClient;
const Subscription = require('lightstreamer-client-node').Subscription;

let latestValue = {
  value: "0",
  timestamp: "0",
  dataTime: null,         // decoded ISO datetime of actual ISS reading
  lastUpdate: new Date()
};

console.log('[ISS-BRIDGE] Starting ISS Toilet Tracker Bridge...');

const lsClient = new LightstreamerClient("https://push.lightstreamer.com", "ISSLIVE");
lsClient.connectionOptions.setSlowingEnabled(false);

const sub = new Subscription("MERGE", ["NODE3000005"], ["Value", "TimeStamp"]);
lsClient.subscribe(sub);

lsClient.addListener({
  onStatusChange: function(status) {
    console.log('[ISS-BRIDGE] Lightstreamer status:', status);
  }
});

// Decode NASA TimeStamp (hours since Jan 1 00:00 UTC of current year)
// into a real Date object. Uses the year from "now" as the reference.
function decodeNasaTimestamp(timestampStr) {
  const totalHours = parseFloat(timestampStr);
  if (isNaN(totalHours)) return null;

  const now = new Date();
  const year = now.getUTCFullYear();

  // NASA's hour counter starts at "Jan 0 00:00 UTC", so subtract one day
  // to align with the JavaScript epoch where Jan 1 00:00 = day 1.
  const startOfYear = Date.UTC(year, 0, 1, 0, 0, 0, 0) - 86400 * 1000;
  const dataMs = startOfYear + totalHours * 3600 * 1000;
  return new Date(dataMs);
}

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
    const dataTime = decodeNasaTimestamp(timestamp);

    latestValue = {
      value: value || "0",
      timestamp: timestamp || "0",
      dataTime: dataTime,
      lastUpdate: new Date()
    };

    console.log(
      `[ISS-BRIDGE] 📊 Urine Tank: ${latestValue.value}% ` +
      `(reading from ${dataTime ? dataTime.toISOString() : 'unknown'})`
    );
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
      // lastUpdate now reflects the ACTUAL ISS data timestamp (decoded),
      // not the bridge's wall-clock time. This is what the ESP displays.
      lastUpdate: latestValue.dataTime
        ? latestValue.dataTime.toISOString()
        : latestValue.lastUpdate.toISOString(),
      bridgeReceivedAt: latestValue.lastUpdate.toISOString(),
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
