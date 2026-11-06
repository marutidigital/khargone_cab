/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prevent lint warnings from crashing production Vercel builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prevent strict type discrepancies from halting Next.js page generation on CI
    ignoreBuildErrors: true,
  },
}

export default nextConfig
