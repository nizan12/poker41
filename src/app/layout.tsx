import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/components/AuthProvider";

export const metadata: Metadata = {
  title: "Remi 41 Online — Permainan Kartu Multiplayer 3D",
  description:
    "Mainkan Remi 41 online dengan teman-temanmu! Pengalaman bermain kartu 3D realtime dengan grafis premium dan multiplayer langsung di browser.",
  keywords: ["remi 41", "kartu", "multiplayer", "online", "card game", "3D", "indonesia"],
  authors: [{ name: "Remi 41 Team" }],
  openGraph: {
    title: "Remi 41 Online",
    description: "Permainan kartu multiplayer 3D terbaik di Indonesia",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F0F1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-text">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
