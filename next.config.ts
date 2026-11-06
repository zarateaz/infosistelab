import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removes the "X-Powered-By: Next.js" response header — no reason to hand
  // an attacker a free framework fingerprint for free.
  poweredByHeader: false,

  // Self-contained build (.next/standalone/server.js + minimal
  // node_modules) — what scripts/deploy-vps.sh runs under PM2. Harmless
  // for `next dev`, only changes what `next build` produces.
  output: "standalone",

  images: {
    // Product photos (uploaded manually, downloaded from a barcode listing,
    // or picked from an image search) live in PRODUCT_IMAGES_DIR on the
    // VPS — outside the repo, symlinked into .next/standalone/public/img/
    // products/ at deploy time (scripts/deploy-vps.sh) so they survive
    // every rebuild. Next's built-in image optimizer doesn't reliably
    // resolve that symlinked path in standalone mode — a freshly written
    // photo comes back "isn't a valid image ... received null" even though
    // the file itself is perfectly valid on disk (confirmed with
    // `identify`/`curl` directly). Every photo is already resized and
    // re-encoded through sharp exactly once at upload time
    // (upload-actions.ts) — there's no benefit to a second optimization
    // pass, only a broken one. Same fix, same reasoning, as the sibling
    // project's next.config.js.
    unoptimized: true,
  },

  // Strips console.* from the client bundle in production (errors/warnings
  // kept, per the `exclude` list) — defense in depth against a stray debug
  // log ever shipping details to the browser console. Doesn't affect
  // `next dev`.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  experimental: {
    serverActions: {
      // Default is 1MB. The inventory scanner sends photos as base64 data
      // URLs straight into a Server Action (uploadProductImage,
      // recognizeProductImage) — base64 alone adds ~33% overhead on top of
      // the 8MB raw-file cap those actions enforce themselves, so this
      // needs real headroom above that, not just above the file size.
      bodySizeLimit: "12mb",
    },
  },

  // Static security headers that don't depend on a per-request nonce (that
  // one lives in src/proxy.ts, alongside the Content-Security-Policy).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // Public site never needs camera/mic/geolocation. /taller-control
            // gets a narrower override below for the barcode scanner's
            // camera — never `self` here, so no public page can ever request it.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            // Only takes effect once served over HTTPS on the real VPS —
            // harmless on plain http:// localhost in the meantime.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Narrower than the blanket policy above — Next.js applies both,
        // and a header value repeated for the same matched path is
        // overwritten by the later entry, so this one wins under
        // /taller-control specifically. The inventory scanner is the one
        // place on the whole site that needs the camera (reading a barcode
        // off a photo or live feed); nothing under /taller-control needs
        // mic or geolocation.
        source: "/taller-control/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
