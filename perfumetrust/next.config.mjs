/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Padrão do Next é 1MB — pequeno demais pro cadastro novo, que manda
    // documento + (verso) + selfie (até 8MB cada) direto num Server
    // Action (src/app/login/actions.ts). Sem isso, o envio falha calado
    // (ou com erro genérico) pra qualquer foto de celular normal.
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
