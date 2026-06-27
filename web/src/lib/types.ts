export type Post = {
  id: string;
  category_id: string;
  caption: string;
  image_url: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  // Author handle + avatar for the action rail / meta block. Optional: demo
  // mode and rows without a joined profile render with fallbacks.
  author?: string | null;
  author_avatar?: string | null;
  // The viewer's own stored 0-10 vote on this post, or null if they haven't
  // rated it (or aren't logged in). When present, the card renders the
  // crowd-reveal state immediately instead of the pre-vote rating row (SPEC §7).
  my_score?: number | null;
};

export type RatingResult = {
  crowd_avg: number;
  count: number;
  your_score: number;
  delta: number;
  already_rated: boolean;
};

export type ValidationResult = {
  is_business_idea: boolean;
  is_pg: boolean;
  reason: string;
  fix_suggestions: string[];
};
