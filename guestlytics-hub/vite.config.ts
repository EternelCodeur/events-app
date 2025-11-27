import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes: { headers: Record<string, string | string[] | undefined> }) => {
              const setCookie = proxyRes.headers["set-cookie"] as string[] | undefined;
              if (setCookie && Array.isArray(setCookie)) {
                proxyRes.headers["set-cookie"] = setCookie.map((cookie) => {
                  let c = cookie.replace(/;\s*Domain=[^;]*/i, "");
                  if (/;\s*SameSite=None/i.test(c)) {
                    c = c.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
                  }
                  c = c.replace(/;\s*Secure/gi, "");
                  return c;
                });
              }
            });
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
