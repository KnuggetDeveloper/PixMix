import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRoute from "./routes/generate";
import { verifyCloudRunToken } from "./middleware/authMiddleware";
import { storeUserToken } from "./services/tokenService";

// Load environment configuration
dotenv.config({ path: ".env.production" });

const app = express();

// CORS configuration
const corsOptions = {
  origin: "*", // In production, specify allowed origins
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Protected routes
app.use("/generate", verifyCloudRunToken, generateRoute);

// Token registration endpoint (for storing FCM tokens)
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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Filter Backend running on port ${PORT}`));
