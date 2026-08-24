import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram No-Crop Carousel Maker | Fit Every Photo",
  description: "Create Instagram carousel images without cropping. Fit every photo into 4:5, 3:4 or square posts, directly in your browser.",
  keywords: ["instagram carousel no crop", "fit whole photo instagram", "instagram carousel crop fix", "instagram carousel maker"],
  openGraph: {
    title: "Instagram No-Crop Carousel Maker",
    description: "Fit every photo into Instagram-ready carousel images. Private, fast, and free.",
    type: "website",
    siteName: "NoCrop Carousel",
  },
  twitter: { card: "summary", title: "Instagram No-Crop Carousel Maker", description: "Fit every photo into Instagram-ready carousel images." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
