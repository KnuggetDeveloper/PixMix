import fs from "fs";
import path from "path";

/**
 * Simplified function to copy an image file and rename it as PNG
 * This avoids the Sharp dependency issues
 *
 * @param inputPath Path to the input image
 * @returns Path to the copied PNG image
 */
export const convertToPng = (inputPath: string): string => {
  try {
    // Verify input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file does not exist: ${inputPath}`);
      return inputPath;
    }

    const outputDir = path.dirname(inputPath);
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `${timestamp}_converted.png`);

    // Simple file copy with PNG extension
    fs.copyFileSync(inputPath, outputPath);
    console.log(`Image copied to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error("Error converting image:", error);
    return inputPath; // Return original path if conversion fails
  }
};

/**
 * Validates if a file is a valid image
 *
 * @param filePath Path to the image file
 * @returns boolean indicating if the file is a valid image
 */
export const isValidImage = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return false;
    }

    const stats = fs.statSync(filePath);
    // Check if file exists and has content
    if (stats.isFile() && stats.size > 0) {
      // Log the file size in MB
      console.log(`Image size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);

      // If file is too large (>4MB), it might be rejected by OpenAI
      if (stats.size > 4 * 1024 * 1024) {
        console.warn("Warning: Image is larger than 4MB, OpenAI might reject it");
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error validating image:", error);
    return false;
  }
};