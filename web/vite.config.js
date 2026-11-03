import { defineConfig } from "vite";
import {resolve} from "node:path";
export default defineConfig({ base: "/isys/",build:{rollupOptions:{input:{main:resolve(import.meta.dirname,"index.html"),vote:resolve(import.meta.dirname,"vote.html")}}} });
