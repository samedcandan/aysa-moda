import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_IMAGE = path.join(PROJECT_ROOT, 'aysamoda-logo.png');
const RES_DIR = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res');

// Mipmap sizes
// Standard launcher icon sizes (full icon)
// Adaptive foreground sizes (108dp base * density)
const SIZES = [
  { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 }
];

async function generate() {
  console.log('Loading source logo:', SOURCE_IMAGE);
  const image = await Jimp.read(SOURCE_IMAGE);

  for (const item of SIZES) {
    const targetDir = path.join(RES_DIR, item.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard ic_launcher.png & ic_launcher_round.png
    const launcher = image.clone();
    launcher.resize({ w: item.iconSize, h: item.iconSize });
    await launcher.write(path.join(targetDir, 'ic_launcher.png'));
    await launcher.write(path.join(targetDir, 'ic_launcher_round.png'));

    // 2. Adaptive ic_launcher_foreground.png (108dp * density, logo centered with padding)
    // Foreground canvas size is fgSize x fgSize
    // Logo should occupy ~66% of foreground (safe zone is central 66-72dp)
    const logoSizeInFg = Math.round(item.fgSize * 0.72);
    const fgLogo = image.clone();
    fgLogo.resize({ w: logoSizeInFg, h: logoSizeInFg });

    const fgCanvas = new Jimp({ width: item.fgSize, height: item.fgSize, color: 0x00000000 });
    const offsetX = Math.round((item.fgSize - logoSizeInFg) / 2);
    const offsetY = Math.round((item.fgSize - logoSizeInFg) / 2);
    fgCanvas.composite(fgLogo, offsetX, offsetY);
    await fgCanvas.write(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${item.name} (${item.iconSize}x${item.iconSize}, fg: ${item.fgSize}x${item.fgSize})`);
  }

  console.log('Icon generation completed successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
