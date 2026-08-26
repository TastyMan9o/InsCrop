import { ImageResponse } from "next/og";

export const alt = "InsCrop — Instagram No-Crop Carousel Maker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#f8f7f4",
        color: "#211f1b",
        display: "flex",
        height: "100%",
        width: "100%",
        padding: "70px 84px",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
        InsCrop<span style={{ color: "#e45d3f" }}>.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            color: "#a44833",
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          INSTAGRAM CAROUSEL, NO CROP
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Georgia",
            fontSize: 74,
            fontWeight: 700,
            letterSpacing: -3,
          }}
        >
          Fit every frame.
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Georgia",
            fontSize: 74,
            fontStyle: "italic",
            letterSpacing: -3,
          }}
        >
          Keep every edge.
        </div>
      </div>
      <div style={{ color: "#625b52", display: "flex", fontSize: 28 }}>
        Free local photo & video canvas maker · Files never leave your device
      </div>
    </div>,
    { ...size },
  );
}
