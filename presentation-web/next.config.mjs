/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bkskokani.cz"
      }
    ]
  }
};

export default nextConfig;
