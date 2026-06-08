/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  env: {
    OPENF1_BASE_URL: process.env.OPENF1_BASE_URL ?? 'https://api.openf1.org/v1',
    ERGAST_BASE_URL: process.env.ERGAST_BASE_URL ?? 'https://ergast.com/api/f1',
  },
};

export default nextConfig;
