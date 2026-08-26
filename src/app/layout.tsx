import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://ins-crop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "InsCrop",
  title: {
    default: "Instagram No-Crop Carousel Maker | InsCrop",
    template: "%s | InsCrop",
  },
  description:
    "Fit whole photos into an Instagram carousel without cropping. Create private, local 4:5, 3:4, square, wide, or custom-size exports.",
  keywords: [
    "instagram carousel no crop",
    "instagram carousel different aspect ratios",
    "instagram carousel crop fix",
    "fit whole photo instagram",
    "instagram carousel photo size",
    "instagram carousel aspect ratio",
    "instagram carousel maker",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Instagram No-Crop Carousel Maker | InsCrop",
    description:
      "Fit whole photos into Instagram-ready carousel frames. Private, fast, and free.",
    url: "/",
    type: "website",
    siteName: "InsCrop",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "InsCrop — Instagram No-Crop Carousel Maker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Instagram No-Crop Carousel Maker",
    description: "Fit whole photos without cropping.",
    images: ["/opengraph-image"],
  },
  category: "Photo and video editing",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
