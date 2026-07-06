/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // Server-side rewrites use Docker service name; 
    // client-side fetch uses NEXT_PUBLIC_BACKEND_URL (http://localhost:4000) directly
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://backend:4000/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
