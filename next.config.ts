import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En desarrollo el servidor se expone en 0.0.0.0 para poder abrirlo desde otro equipo
  // de la red o desde una tablet; sin esta lista Next rechaza con 403 los chunks que el
  // navegador pide en modo CORS y la aplicación se queda sin hidratar.
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
  // Solo el driver nativo queda fuera del bundle. El cliente generado en
  // src/generated/prisma se empaqueta: si @prisma/client es "external",
  // el collect de Vercel no resuelve el alias @/ y el build muere.
  serverExternalPackages: ["pg"],
  experimental: {
    // Las capturas envían fotos del reporte diario junto con las cantidades.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
