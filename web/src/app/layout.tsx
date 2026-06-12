import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OMEGA × Langfuse | Incident Intelligence Loop",
  description: "Self-improving multi-agent crisis response with Langfuse observability",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
