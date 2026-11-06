import { ImageResponse } from "next/og";

export const alt = "INFOSISTEL — Reparación y venta de tecnología en Huancayo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static generation: rendered once at build time, cached forever after —
// only link-preview crawlers (WhatsApp, Facebook, etc.) ever fetch this.
// Real visitors never load it, so it has zero effect on page load speed.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #0a5fdb 0%, #08469e 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 140,
              height: 140,
              borderRadius: 36,
              background: "rgba(255,255,255,0.14)",
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 800,
            }}
          >
            IS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "#ffffff",
            }}
          >
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1 }}>
              INFOSISTEL
            </div>
            <div style={{ fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
              Reparamos laptops, PC e impresoras — Huancayo
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
