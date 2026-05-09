import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhoomi Suraksha — भूमि सुरक्षा · Land Verification Portal",
  description:
    "Apni Zameen, Apna Haq. Upload your land documents — get verified, structured legal data in seconds. Built for every khasra, every Utara, every acre of Indian soil.",
  keywords: "property documents, AI analysis, Khatauni, Khasra, land verification, Bhoomi Suraksha, भूमि सुरक्षा",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Kalam:wght@300;400;700&family=Architects+Daughter&family=Noto+Sans+Devanagari:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
