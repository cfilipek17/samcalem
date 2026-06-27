import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pitchwreck — Post your worst. Watch it burn.",
  description:
    "A feed of gloriously bad AI startup ideas. Scroll, rate them 0–10, and see if you agree with the crowd.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pitchwreck", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  // Edge-to-edge PWA: enable env(safe-area-inset-*) and lock the feed against
  // accidental pinch-zoom.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
