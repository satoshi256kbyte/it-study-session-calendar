/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath:
    process.env.NODE_ENV === 'production' ? '/it-study-session-calendar' : '',
  assetPrefix:
    process.env.NODE_ENV === 'production' ? '/it-study-session-calendar/' : '',
  // SWCを無効にしてBabelを使用（CI環境での安定性向上）
  swcMinify: false,
  experimental: {
    forceSwcTransforms: false,
  },
}

module.exports = nextConfig
