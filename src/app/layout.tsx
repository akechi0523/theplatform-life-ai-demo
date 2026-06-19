import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Single typeface across the whole system (Cosmica substitute) — every badge,
// button, nav link, heading and body uses it; hierarchy is weight-driven.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThePlatform.life AI",
  description:
    "Describe a real-life scenario or decision. ThePlatform.life AI reveals how each of the 9 perspectives within the 360° of Perspectives would perceive, feel, and respond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
