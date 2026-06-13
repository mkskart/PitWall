/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  experimental: {
    // Barrel-optimize the heavy UI/3D libraries so dev compilation only pulls
    // in the icons/components actually used, instead of walking the entire
    // package. Cuts the cold-compile module count (and time) dramatically.
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'recharts',
      'framer-motion',
      'lucide-react',
      'date-fns',
    ],
  },
  webpack: (config) => {
    // A cold dev compile of the R3F/three scene can take longer than webpack's
    // default 120s chunk-load timeout on slower machines; raise it so the
    // browser waits for the chunk instead of throwing ChunkLoadError.
    config.output.chunkLoadTimeout = 600000;
    return config;
  },
};

export default nextConfig;
