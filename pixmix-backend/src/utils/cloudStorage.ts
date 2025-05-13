import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import path from "path";

// Initialize Storage with Firebase credentials
const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const bucketName = process.env.GCS_BUCKET_NAME || "pixmix-6a12e.firebasestorage.app";

/**
 * Upload file to Google Cloud Storage
 */
export async function uploadFile(localFilePath: string): Promise<string> {
  const filename = path.basename(localFilePath);
  const destination = `uploads/${Date.now()}-${filename}`;

  await storage.bucket(bucketName).upload(localFilePath, {
    destination,
    metadata: {
      cacheControl: "no-cache",
    },
  });

  return `gs://${bucketName}/${destination}`;
}

/**
 * Delete file from Google Cloud Storage
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);

  const [, bucket, filePath] = matches;
  await storage.bucket(bucket).file(filePath).delete();
}

/**
 * Create a readable stream from a Cloud Storage file
 */
export async function createReadStreamFromGCS(gcsPath: string): Promise<Readable> {
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);

  const [, bucket, filePath] = matches;
  return storage.bucket(bucket).file(filePath).createReadStream();
}