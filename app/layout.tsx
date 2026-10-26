import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "GNMTC · Fleet Watch",
  description: "Destinazioni dichiarate, ETA e riscontri della flotta mercantile GNMTC.",
  icons: {
    icon: "/assets/gaddafi-portrait.jpg",
    shortcut: "/assets/gaddafi-portrait.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
