/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Las imágenes son privadas y se sirven desde /imagenes con la sesión del usuario
  // (ver src/app/imagenes): no hace falta habilitar dominios remotos.
};

export default nextConfig;
