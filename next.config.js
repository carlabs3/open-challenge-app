/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // mongoose es una dependencia solo de servidor: se excluye del bundle de las
  // route handlers para que Next no intente empaquetar sus binarios opcionales.
  // (En Next 14 la clave estable es experimental.serverComponentsExternalPackages.)
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "bcryptjs"],
  },
};

export default nextConfig;
