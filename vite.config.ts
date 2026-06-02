import { createReadStream, cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const projectRoot = process.cwd();
const petsRoot = resolve(projectRoot, "pets");

function petPackStaticPlugin(): Plugin {
  const mimeTypes: Record<string, string> = {
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml; charset=utf-8",
  };
  let outDir = "dist";

  return {
    name: "desktop-livecat-pet-packs",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "", "http://localhost").pathname;
        if (!pathname.startsWith("/pets/")) {
          next();
          return;
        }

        const relativePath = decodeURIComponent(pathname.replace(/^\/pets\//, ""));
        const filePath = resolve(petsRoot, relativePath);
        const relativeToPetsRoot = relative(petsRoot, filePath);
        if (relativeToPetsRoot.startsWith("..") || relativeToPetsRoot === "") {
          response.statusCode = 403;
          response.end("Forbidden");
          return;
        }

        if (!existsSync(filePath)) {
          next();
          return;
        }

        const stats = statSync(filePath);
        if (!stats.isFile()) {
          next();
          return;
        }

        response.setHeader(
          "Content-Type",
          mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
        );
        response.setHeader("Cache-Control", "no-cache");
        createReadStream(filePath).pipe(response);
      });
    },
    writeBundle() {
      if (!existsSync(petsRoot)) return;
      const target = resolve(projectRoot, outDir, "pets");
      mkdirSync(target, { recursive: true });
      cpSync(petsRoot, target, { recursive: true, force: true });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), petPackStaticPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
