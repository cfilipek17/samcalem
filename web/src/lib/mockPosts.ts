import type { Post } from "./types";

// Shown when Supabase isn't configured yet, so the feed renders out of the box.
// Each post points at a real seeded hero image under /public/seed so demo mode
// looks like the live product.
export const MOCK_POSTS: Post[] = [
  {
    id: "mock-1",
    category_id: "startup-ideas",
    caption:
      "Uber, but the driver is also an unlicensed therapist who will not stop talking about their ex.",
    image_url: "/seed/idea-1.png",
    rating_avg: 7.2,
    rating_count: 418,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-2",
    category_id: "startup-ideas",
    caption:
      "A subscription box that mails you one (1) raw potato per month. The brand is built on mystery.",
    image_url: "/seed/idea-2.png",
    rating_avg: 4.6,
    rating_count: 1203,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-3",
    category_id: "startup-ideas",
    caption:
      "An AI smart fridge that locks itself and gaslights you about whether you already ate.",
    image_url: "/seed/idea-3.png",
    rating_avg: 8.9,
    rating_count: 2740,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-4",
    category_id: "startup-ideas",
    caption: "LinkedIn, but every post is read aloud by a medieval town crier.",
    image_url: "/seed/idea-4.png",
    rating_avg: 6.1,
    rating_count: 88,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-5",
    category_id: "startup-ideas",
    caption:
      "Airbnb, but for renting your neighbor’s unsecured wifi by the hour.",
    image_url: "/seed/idea-5.png",
    rating_avg: 5.7,
    rating_count: 642,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "mock-6",
    category_id: "startup-ideas",
    caption:
      "A dating app that only matches people with the exact same phone battery percentage.",
    image_url: "/seed/idea-6.png",
    rating_avg: 7.8,
    rating_count: 1556,
    created_at: new Date(0).toISOString(),
  },
];
