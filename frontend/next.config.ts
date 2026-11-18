import type { NextConfig } from "next";

// Tüm sayfalara eklenen temel güvenlik başlıkları.
const securityHeaders = [
  // Sayfanın başka sitelerde iframe içinde açılmasını engeller (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Docker imajı için yalnızca çalışmak üzere gereken dosyaları .next/standalone
  // klasörüne çıkarır (bkz. frontend/Dockerfile).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Panel sayfaları oturum (sessionStorage) tarayıcıda doğrulandıktan sonra
    // render edildiği için sunucu tarafında "anında gezinme" doğrulamasına
    // uygun değildir. Yalnızca `instant` ile açıkça işaretlenen segmentler
    // (ör. login sayfası) doğrulanır.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
};

export default nextConfig;
