import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liquid Notes — AI Note-Taking",
  description:
    "Premium glassmorphism note-taking app with AI-powered organization and search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-background" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
