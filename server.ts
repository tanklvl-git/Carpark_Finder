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

  // Google Maps JS bootstrap loader script proxy (Keeps key server-side)
  app.get("/api/maps-js", (req, res) => {
    const key = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
    if (!key || key === "MY_GOOGLE_MAPS_KEY" || key === "YOUR_API_KEY") {
      res.setHeader("Content-Type", "application/javascript");
      return res.status(200).send(`
        console.warn("Google Maps API key is not configured in process.env.GOOGLE_MAPS_PLATFORM_KEY");
        window.__GOOGLE_MAPS_KEY_MISSING__ = true;
      `);
    }
    const callback = req.query.callback ? encodeURIComponent(String(req.query.callback)) : "initGoogleMap";
    const libraries = "places,geometry,marker";
    const targetUrl = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}&libraries=${libraries}&v=weekly`;
    res.redirect(targetUrl);
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
