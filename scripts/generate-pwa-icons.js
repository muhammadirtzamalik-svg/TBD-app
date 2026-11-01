import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

// 1. Standard SVG content
const svgContent = fs.readFileSync(path.join(publicDir, 'icon.svg'), 'utf8');

// 2. Maskable SVG: full-bleed background (#1c1917) and helmet graphics scaled down to fit within central 80% safe zone
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#1c1917" />
  <circle cx="256" cy="256" r="220" fill="#292524" />
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M128 320 C128 200, 200 160, 256 160 C312 160, 384 200, 384 320 Z" fill="#f59e0b" />
    <rect x="110" y="320" width="292" height="34" rx="10" fill="#d97706" />
    <path d="M242 160 L242 320 L270 320 L270 160 Z" fill="#b45309" opacity="0.6"/>
    <rect x="220" y="380" width="72" height="18" rx="4" fill="#f97316" />
    <rect x="170" y="406" width="78" height="18" rx="4" fill="#fb923c" />
    <rect x="264" y="406" width="78" height="18" rx="4" fill="#fb923c" />
  </g>
</svg>`;

// 3. Apple Touch Icon: solid square background (#1c1917), 180x180
const appleTouchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="#1c1917" />
  <circle cx="90" cy="90" r="75" fill="#292524" />
  <g transform="translate(18, 18) scale(0.28)">
    <path d="M128 320 C128 200, 200 160, 256 160 C312 160, 384 200, 384 320 Z" fill="#f59e0b" />
    <rect x="110" y="320" width="292" height="34" rx="10" fill="#d97706" />
    <path d="M242 160 L242 320 L270 320 L270 160 Z" fill="#b45309" opacity="0.6"/>
    <rect x="220" y="380" width="72" height="18" rx="4" fill="#f97316" />
    <rect x="170" y="406" width="78" height="18" rx="4" fill="#fb923c" />
    <rect x="264" y="406" width="78" height="18" rx="4" fill="#fb923c" />
  </g>
</svg>`;

async function generate() {
  console.log('Generating PWA icons...');

  // pwa-192x192.png
  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // pwa-512x512.png
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // pwa-maskable-512x512.png
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // apple-touch-icon.png (180x180)
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // Also create icon-192.png and icon-512.png as compatibility aliases
  fs.copyFileSync(path.join(publicDir, 'pwa-192x192.png'), path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'pwa-512x512.png'), path.join(publicDir, 'icon-512.png'));
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
