import type { Post } from "./types";

// Shown when Supabase isn't configured yet, so the feed renders out of the box.
export const MOCK_POSTS: Post[] = [
  {
    id: "mock-1",
    category_id: "startup-ideas",
    caption:
      "Uber, but the driver is also an unlicensed therapist who won't stop talking about their ex.",
    image_url: null,
    rating_avg: 7.2,
    rating_count: 418,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-2",
    category_id: "startup-ideas",
    caption:
      "A subscription box that mails you one (1) raw potato per month. The brand is built on mystery.",
    image_url: null,
    rating_avg: 4.6,
    rating_count: 1203,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-3",
    category_id: "startup-ideas",
    caption:
      "AI-powered smart fridge that locks itself and gaslights you about whether you already ate.",
    image_url: null,
    rating_avg: 8.9,
    rating_count: 2740,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-4",
    category_id: "startup-ideas",
    caption:
      "LinkedIn, but every post is read aloud by a medieval town crier. $40/mo. Enterprise tier available.",
    image_url: null,
    rating_avg: 6.1,
    rating_count: 88,
    created_at: new Date(0).toISOString(),
  },
];
