/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // CloudFront用設定（basePathとassetPrefixを削除）
}

module.exports = nextConfig
