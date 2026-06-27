import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pitchwreck — Post your worst. Watch it burn.",
  description:
    "A feed of gloriously bad AI startup ideas. Scroll, rate them 0–10, and see if you agree with the crowd.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pitchwreck", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#0a0a0a",
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
