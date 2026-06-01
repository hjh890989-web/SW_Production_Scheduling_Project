/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  webpack: (config) => {
    // Workaround: Windows + path with spaces causes EISDIR on readlink for non-symlink files.
    // Disabling symlink resolution avoids the misbehavior in enhanced-resolve.
    config.resolve.symlinks = false;
    return config;
  },
};

module.exports = nextConfig;
