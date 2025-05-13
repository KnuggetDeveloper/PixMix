// pixmix-backend/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRoute from "./routes/generate";
import { verifyCloudRunToken } from "./middleware/authMiddleware";
import { storeUserToken } from "./services/tokenService";

// Load environment configuration
dotenv.config({ path: ".env.production" });

const app = express();

// CORS configuration - MUST come before routes
const corsOptions = {
  origin: true, // Allow all origins, or specify allowed origins as array
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS requests explicitly
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Protected routes
app.use("/generate", verifyCloudRunToken, generateRoute);

// Token registration endpoint
app.post("/register-token", async (req, res): Promise<any> => {
  try {
    const { userId, fcmToken, platform } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        error: "Missing required fields: userId and fcmToken",
      });
    }

    await storeUserToken(userId, fcmToken, platform);

    res.json({
      success: true,
      message: "Token registered successfully",
    });
  } catch (error) {
    console.error("Token registration error:", error);
    res.status(500).json({ error: "Failed to register token" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Filter Backend running on port ${PORT}`));