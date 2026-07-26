/** @type {import('next').NextConfig} */

// Content-Security-Policy.
//
// The Pages Router inlines hydration data and a small bootstrap script (see
// pages/_document.tsx), so `script-src 'unsafe-inline'` is required without a
// nonce-based setup; `'unsafe-eval'` is kept for framework/runtime
// compatibility. This still meaningfully limits XSS blast radius — no external
// script sources, no framing (clickjacking), no plugins/objects, no base-tag or
// form-action hijacking — which matters here because the app renders arbitrary
// third-party README markdown and serves a user-influenced SVG badge.
//
// Images are allowed over any HTTPS origin: READMEs embed images from many
// hosts (including avatars.githubusercontent.com and raw.githubusercontent.com),
// and images are not a script-execution vector. The browser only talks to the
// same-origin API (Gemini is called server-side from /api/ai-insight), so
// `connect-src` is 'self'.
//
// If any legitimate resource is unexpectedly blocked, switch the header key
// below to 'Content-Security-Policy-Report-Only' to observe violations without
// enforcing, then tighten and re-enable.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' data:",
  "connect-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  generateEtags: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
