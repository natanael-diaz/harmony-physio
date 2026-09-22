/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile local workspace packages
  transpilePackages: ["@harmony/ui", "@harmony/types", "@harmony/db"],

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com https://*.daily.co wss://*.daily.co",
              "frame-src https://js.stripe.com https://*.daily.co",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Log output in production: standalone for Docker / ECS
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  experimental: {
    // Server Actions are stable in Next 14, but include for clarity
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "") ?? "",
      ].filter(Boolean),
    },
  },
};

module.exports = nextConfig;
