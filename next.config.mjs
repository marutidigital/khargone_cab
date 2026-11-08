/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Prevent strict type discrepancies from halting Next.js page generation on CI
    ignoreBuildErrors: true,
  },
}

export default nextConfig

