import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root=dirname(fileURLToPath(import.meta.url));
export default defineConfig({base:"/isys/",build:{rollupOptions:{input:{main:resolve(root,"index.html"),vote:resolve(root,"vote.html")}}}});
