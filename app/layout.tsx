import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "你画我猜 · 双人版",
  description: "实时共享画板与猜词",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
