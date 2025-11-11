/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: [] },
  env: {
    NEXT_PUBLIC_APP_TIMEZONE: 'Europe/Istanbul',
  },
};

module.exports = nextConfig;
