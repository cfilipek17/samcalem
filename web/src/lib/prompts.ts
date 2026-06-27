// Builds the image prompt from a category's style + the user's pasted idea.
// Design intent (Calem, 2026-06-26): the IDEA carries the comedy — the image
// should render the absurd premise STRAIGHT, like a real startup's hero shot:
// polished, eye-catching, believable, with only a subtle wry twist. NOT
// slapstick / cartoonish / "trying to be funny". Deadpan > goofy.

const DEFAULT_STYLE =
  "high-quality, eye-catching advertising/product visual; clean modern composition, rich lighting, vibrant but tasteful color; rendered straight and believable like a real startup's hero image; only a subtle, dry comedic undertone; scroll-stopping and polished, NOT cartoonish, slapstick, or exaggerated";

export function buildImagePrompt(sourceText: string, imageStyle = DEFAULT_STYLE): string {
  const idea = sourceText.trim().slice(0, 600);
  return `${imageStyle}. Depict this startup idea as if it were a real product or brand, played completely straight so the absurdity speaks for itself: "${idea}". No text, no words, no logos in the image.`;
}
