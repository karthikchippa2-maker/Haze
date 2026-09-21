// haze server - Scramjet v2 web proxy with wisp transport
import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import express from "express";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(__dirname, "public");

// resolve dist dirs without executing the packages - libcurl 2.x's emscripten
// glue throws outside browsers, and the controller only exports its main entry
const require = createRequire(import.meta.url);
const controllerPath = path.dirname(
  require.resolve("@mercuryworkshop/scramjet-controller")
);
const libcurlPath = path.dirname(
  require.resolve("@mercuryworkshop/libcurl-transport")
);

// ---- wisp (the websocket transport that carries proxied traffic) ----
logging.set_level(logging.WARN);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  dns_servers: ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"],
});

const app = express();

// note: no COOP/COEP headers - scramjet v2's transport doesn't need
// SharedArrayBuffer, and COEP require-corp blocks proxied cross-origin frames

// ---- static frontend ----
app.use(express.static(publicPath));

// ---- scramjet v2 / controller / transport client files ----
// these paths line up with the controller's default config
app.use("/scramjet/", express.static(scramjetPath));
app.use("/controller/", express.static(controllerPath));
app.use("/libcurl/", express.static(libcurlPath));

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicPath, "404.html"));
});

const server = createServer(app);

// ---- wisp rides on the same port, at /wisp/ ----
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

const port = parseInt(process.env.PORT || "") || 8000;
const host = process.env.HOST || "0.0.0.0";

server.listen(port, host, () => {
  console.log("");
  console.log("  haze is up (scramjet v2)");
  console.log(`  local   -> http://localhost:${port}`);
  console.log(`  network -> http://${hostname()}:${port}`);
  console.log("");
  console.log("  wisp endpoint: /wisp/");
  console.log("");
});
