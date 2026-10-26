/** @type {import('next').NextConfig} */
const backendApiUrl = (process.env.BACKEND_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
