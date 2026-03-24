import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nm = (...segments) => path.join(__dirname, "node_modules", ...segments)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parent folder (snake-dapp) has its own package-lock.json; pin Turbopack root to Nest app.
  turbopack: {
    root: __dirname,
    // CSS @import "tailwindcss" otherwise resolves from monorepo root package.json (no tailwind there).
    resolveAlias: {
      tailwindcss: nm("tailwindcss"),
      "tw-animate-css": nm("tw-animate-css"),
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
