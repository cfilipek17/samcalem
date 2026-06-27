// Builds the image prompt from a category's style + the user's pasted idea.
// Keeping this in one place so adding categories later stays trivial (SPEC §2b).

const DEFAULT_STYLE =
  "flat cartoon illustration, bold black outlines, exaggerated comical expressions, vibrant colors, satirical poster, funny";

export function buildImagePrompt(sourceText: string, imageStyle = DEFAULT_STYLE): string {
  const idea = sourceText.trim().slice(0, 600);
  return `${imageStyle}. A comical poster visualizing this absurd startup idea: "${idea}". No text in the image.`;
}
