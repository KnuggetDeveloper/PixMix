import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI, toFile } from "openai";
import { getPromptForFilter } from "../utils/prompts";
import { sendNotification } from "../services/notifications";
import { uploadFile, deleteFile, createReadStreamFromGCS } from "../utils/cloudStorage";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), "uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  const { filter, fcmToken } = req.body;
  const imagePath = req.file?.path;
  let gcsPath: string | null = null;

  if (!imagePath || !fs.existsSync(imagePath)) {
    res.status(400).json({ error: "Image not uploaded or invalid format" });
    return;
  }

  try {
    console.log(`Processing image with filter: ${filter}`);
    const prompt = getPromptForFilter(filter);

    // Upload to Google Cloud Storage for processing
    gcsPath = await uploadFile(imagePath);
    const imageStream = await createReadStreamFromGCS(gcsPath);
    const imageFile = await toFile(imageStream, path.basename(imagePath), {
      type: "image/png",
    });

    // Process with OpenAI
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: prompt,
    });

    // Extract result
    let imageUrl;
    if (response.data?.[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
    } else if (response.data?.[0]?.url) {
      imageUrl = response.data[0].url;
    } else {
      throw new Error("No image data returned from OpenAI");
    }

    // Send notification if FCM token provided
    if (fcmToken) {
      try {
        await sendNotification(fcmToken, imageUrl, filter);
        console.log("FCM notification sent successfully");
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error processing image:", error);
    res.status(500).json({
      error: "Image processing failed",
      message: error.message || "Unknown error",
    });
  } finally {
    // Cleanup
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    if (gcsPath) {
      try {
        await deleteFile(gcsPath);
      } catch (e) {
        console.error("Error deleting GCS file:", e);
      }
    }
  }
});

export default router;