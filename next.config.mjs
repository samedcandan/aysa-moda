/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mobil build için koşullu static export
  ...(process.env.MOBILE_BUILD === 'true' && {
    output: 'export',
    images: { unoptimized: true },
    trailingSlash: true,
  }),

  // CORS header'ları — Capacitor mobil uygulamasından API erişimi
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;
