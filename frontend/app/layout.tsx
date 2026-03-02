import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhoomi Suraksha — AI Property Document Analysis & Audio Narration",
  description:
    "Upload property documents, get AI-powered entity extraction and audio narration. Understand your Khatauni, Sale Deed, Registry in simple Hinglish. Aapki Zameen, Aapki Suraksha.",
  keywords: "property documents, AI analysis, Khatauni, Khasra, text to speech, document narration, Bhoomi Suraksha",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
