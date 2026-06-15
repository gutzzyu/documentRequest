import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Catch-all route to prevent 404s inside /api route namespace
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found under corporate namespace" });
});

export default app;
