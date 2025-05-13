// gcloud-authentication/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();

// CORS configuration - MUST come before routes
const corsOptions = {
  origin: true, // Allow all origins in development, restrict in production
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Device-ID", "X-App-Version", "X-Platform"],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false,
  maxAge: 86400, // Cache preflight response for 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS requests explicitly
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json());

// Health check endpoint (before authentication)
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Authentication routes
app.use("/auth", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Authentication service running on port ${PORT}`);
});