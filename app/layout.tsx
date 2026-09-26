import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "naze-sosdown",
  description:
    "Unduh video dan foto dari TikTok dan Instagram tanpa API resmi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
