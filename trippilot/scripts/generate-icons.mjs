import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const sourceSvgPath = path.join(publicDir, "icon-1.svg");

function renderPng(svgText, size) {
  const resvg = new Resvg(svgText, {
    fitTo: {
      mode: "width",
      value: size,
    },
    font: {
      loadSystemFonts: false,
    },
  });

  const rendered = resvg.render();
  return rendered.asPng();
}

async function main() {
  const svgBuffer = await readFile(sourceSvgPath);
  const svgText = svgBuffer.toString("utf8");

  const png16 = renderPng(svgText, 16);
  const png32 = renderPng(svgText, 32);
  const png180 = renderPng(svgText, 180);
  const png192 = renderPng(svgText, 192);
  const png512 = renderPng(svgText, 512);

  await writeFile(path.join(publicDir, "favicon-16x16.png"), png16);
  await writeFile(path.join(publicDir, "favicon-32x32.png"), png32);
  await writeFile(path.join(publicDir, "apple-touch-icon.png"), png180);
  await writeFile(path.join(publicDir, "android-chrome-192x192.png"), png192);
  await writeFile(path.join(publicDir, "android-chrome-512x512.png"), png512);

  const icoBuffer = await pngToIco([png16, png32]);
  await writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);

  const manifest = {
    name: "TripPilot",
    short_name: "TripPilot",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };

  await writeFile(
    path.join(publicDir, "site.webmanifest"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  // eslint-disable-next-line no-console
  console.log("Generated favicon assets in /public");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
