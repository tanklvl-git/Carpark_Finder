import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import insightHandler from "./api/insight.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes: /api/insight and /api/insight.js
  app.all("/api/insight", (req, res) => {
    insightHandler(req, res);
  });

  app.all("/api/insight.js", (req, res) => {
    insightHandler(req, res);
  });

  // Dedicated OneMap Search API Proxy endpoint
  // Example: /api/onemap/search?searchVal=raffles%20place&returnGeom=Y&getAddrDetails=Y&pageNum=1
  app.get("/api/onemap/search", async (req, res) => {
    try {
      const searchVal = String(req.query.searchVal || req.query.q || "").trim();
      const returnGeom = req.query.returnGeom !== "N" ? "Y" : "N";
      const getAddrDetails = req.query.getAddrDetails !== "N" ? "Y" : "N";
      const pageNum = parseInt(String(req.query.pageNum || "1"), 10) || 1;

      if (!searchVal) {
        return res.status(400).json({ error: "Missing required query parameter 'searchVal'" });
      }

      const targetUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchVal)}&returnGeom=${returnGeom}&getAddrDetails=${getAddrDetails}&pageNum=${pageNum}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(targetUrl, {
        headers: { "accept": "application/json", "User-Agent": "ParkFinder-Insight/1.0" },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const json = await response.json();
      res.setHeader("Content-Type", "application/json");
      return res.status(response.status).json(json);
    } catch (err: any) {
      return res.status(500).json({ error: "OneMap search proxy failure: " + err.message });
    }
  });

  // Vite development middleware or production static server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Car Park Finder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
