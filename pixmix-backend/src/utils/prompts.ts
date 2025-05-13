// src/utils/prompts.ts
export const filterPrompts: Record<string, string> = {
  Ghibli:
    "Transform this image into a whimsical Studio Ghibli-style anime artwork with soft colors, gentle details, and the characteristic Ghibli charm.",
  Pixar: "Edit this image to look like a 3D Pixar-style animated character with expressive features, vibrant colors, and the signature Pixar lighting and texture.",
  Sketch: "Convert this image into a detailed pencil sketch with artistic shading and fine line work, as if it was hand-drawn by a skilled artist.",
  Cyberpunk: "Transform this image into a cyberpunk-themed version with neon lights, futuristic tech elements, urban dystopian vibes, and a moody, high-contrast color palette.",
};

export const getPromptForFilter = (filter: string): string =>
  filterPrompts[filter] || "Edit this image in a creative, artistic style while maintaining the main subject's recognizable features.";