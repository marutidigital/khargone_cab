/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prevent lint warnings from crashing production Vercel builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep typecheck active, but ensure unhandled non-fatal warnings don't block
    ignoreBuildErrors: false,
  },
}

export default nextConfig
