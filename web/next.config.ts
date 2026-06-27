import type { NextConfig } from "next";
import path from "node:path";

// Derive the Supabase Storage host from the public URL so next/image can
// optimize feed images. Falls back gracefully when the env var is absent
// (demo mode renders the gradient placeholder, no remote images).
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't pick up a stray lockfile elsewhere.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Required in Next.js 16 — only these qualities may be requested.
    qualities: [75, 90],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
