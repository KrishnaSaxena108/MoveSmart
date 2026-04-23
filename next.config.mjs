/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: '/Users/akshitsalwan/Downloads/MoveSmart',
  },
  allowedDevOrigins: [
    '10.30.29.20',
    '192.168.29.51',
    'localhost',
    '127.0.0.1',
  ],
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

export default nextConfig
