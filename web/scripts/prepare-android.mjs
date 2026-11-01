import {readFileSync,writeFileSync} from "node:fs";
const path="dist/index.html";
let html=readFileSync(path,"utf8");
html=html.replaceAll('href="/isys/','href="./').replaceAll('src="/isys/','src="./');
// Capacitor serves assets from its own local origin; the web PWA worker is for GitHub Pages only.
html=html.replace(/<script>if\("serviceWorker" in navigator\).*?<\/script>/s,"");
writeFileSync(path,html);
console.log("FOXA Android assets prepared for local WebView origin");
