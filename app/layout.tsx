import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Story Studio · Your stories, brought to life",
  description:
    "A personal video production studio for storytelling in Telugu, Hindi and English.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
