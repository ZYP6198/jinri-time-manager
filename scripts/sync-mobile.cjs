const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const assets = ["index.html", "styles.css", "app.js", "favicon.svg", "icon.svg", "manifest.webmanifest", "sw.js"];

fs.mkdirSync(output, { recursive: true });
for (const asset of assets) fs.copyFileSync(path.join(root, asset), path.join(output, asset));

console.log(`已同步 ${assets.length} 个移动端资源到 www/`);
