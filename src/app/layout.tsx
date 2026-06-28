import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ChromeBackground } from "@/components/ChromeBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexAI — Signal to post in 2 minutes",
  description: "Autonomous multi-agent growth pod: market research → angle → creative → staged post",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <ChromeBackground />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
