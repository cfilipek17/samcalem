// Builds the image prompt from a category's style + the user's pasted idea.
// Design intent (Calem, 2026-06-26): the IDEA carries the comedy — the image
// should render the absurd premise STRAIGHT, like a real startup's hero shot:
// polished, eye-catching, believable, with only a subtle wry twist. NOT
// slapstick / cartoonish / "trying to be funny". Deadpan > goofy.

const DEFAULT_STYLE =
  "Premium advertising/editorial product photograph of the startup idea rendered as a REAL, named brand. CRITICAL: anchor the premise in ONE clearly visible hero object — a physical product, package, device screen, storefront, or signage — that by itself communicates the idea; place it centered and in sharp focus so a viewer scrolling fast instantly 'gets it' without reading. Avoid generic lifestyle/stock scenes (people just sitting, talking, or gesturing) where the concept is implied but not shown. Studio-grade or natural light, shallow depth of field, clean modern composition, rich tasteful color, photoreal materials. Play the absurdity completely straight — deadpan, dignified, like a Kickstarter hero shot or a glossy magazine ad — never slapstick, cartoonish, exaggerated, or winking. If any text or label is needed to land the joke, limit it to ONE short punchy line or product name (no paragraphs), set in elegant minimalist type. The humor comes entirely from the straight-faced presentation of an absurd real-looking product.";

export function buildImagePrompt(sourceText: string, imageStyle = DEFAULT_STYLE): string {
  const idea = sourceText.trim().slice(0, 600);
  return `${imageStyle} The startup idea to depict: "${idea}".`;
}
