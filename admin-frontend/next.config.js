/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    NEXT_PUBLIC_USER_POOL_ID: process.env.NEXT_PUBLIC_USER_POOL_ID,
    NEXT_PUBLIC_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    NEXT_PUBLIC_USER_POOL_DOMAIN: process.env.NEXT_PUBLIC_USER_POOL_DOMAIN,
    NEXT_PUBLIC_REDIRECT_SIGN_IN: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN,
    NEXT_PUBLIC_REDIRECT_SIGN_OUT: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT
  }
}

module.exports = nextConfig
