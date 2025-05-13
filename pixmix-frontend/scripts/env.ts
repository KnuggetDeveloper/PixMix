// scripts/env.ts
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// API keys and configuration
const config = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  API_BASE_URL: process.env.MAIN_SERVICE_URL || "",
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "",
};

// Verify critical configuration
if (!config.OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is not set in environment variables or .env file"
  );
}

export default config;
