import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.resolve(__dirname, '../public/icons/logo.png');
const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

// Icon sizes
const iconConfigs = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Splash screen sizes (dikey & yatay)
const splashConfigs = [
  // Portrait (Dikey)
  { dir: 'drawable-port-mdpi', w: 320, h: 480, name: 'screen.png' },
  { dir: 'drawable-port-hdpi', w: 480, h: 800, name: 'screen.png' },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280, name: 'screen.png' },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, name: 'screen.png' },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, name: 'screen.png' },
  // Landscape (Yatay)
  { dir: 'drawable-land-mdpi', w: 480, h: 320, name: 'screen.png' },
  { dir: 'drawable-land-hdpi', w: 800, h: 480, name: 'screen.png' },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720, name: 'screen.png' },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, name: 'screen.png' },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, name: 'screen.png' },
];

async function generate() {
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error(`Logo file not found at: ${LOGO_PATH}`);
  }

  const logo = await Jimp.read(LOGO_PATH);
  console.log('Logo loaded successfully.');

  // 1. Android Mipmap İkonlarını Oluştur
  for (const config of iconConfigs) {
    const iconDir = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(iconDir)) {
      fs.mkdirSync(iconDir, { recursive: true });
    }
    
    // Standart ikon
    const icon = logo.clone();
    icon.resize({ w: config.size, h: config.size });
    await icon.write(path.join(iconDir, 'ic_launcher.png'));
    
    // Yuvarlak ikon
    const iconRound = logo.clone();
    iconRound.resize({ w: config.size, h: config.size });
    await iconRound.write(path.join(iconDir, 'ic_launcher_round.png'));
    
    console.log(`[Icon] Generated: ${config.dir} (${config.size}x${config.size})`);
  }

  // 2. Android Drawable Splash Ekranlarını Oluştur
  for (const config of splashConfigs) {
    const splashDir = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(splashDir)) {
      fs.mkdirSync(splashDir, { recursive: true });
    }

    // Koyu kömür #06080c arka plan oluştur
    const canvas = new Jimp({
      width: config.w,
      height: config.h,
      color: 0x06080cff // Hex RGBA
    });

    // Logo boyutu ekranın en küçük boyutunun %40'ı olacak şekilde ayarlanır
    const logoSize = Math.round(Math.min(config.w, config.h) * 0.4);
    const resizedLogo = logo.clone();
    resizedLogo.resize({ w: logoSize, h: logoSize });

    // Tam ortala
    const x = Math.round((config.w - logoSize) / 2);
    const y = Math.round((config.h - logoSize) / 2);
    
    canvas.composite(resizedLogo, x, y);

    await canvas.write(path.join(splashDir, config.name));
    console.log(`[Splash] Generated: ${config.dir} (${config.w}x${config.h})`);

    // Default fallback copy to drawable/screen.png
    if (config.dir === 'drawable-port-xhdpi') {
      const defaultSplashDir = path.join(RES_DIR, 'drawable');
      if (!fs.existsSync(defaultSplashDir)) {
        fs.mkdirSync(defaultSplashDir, { recursive: true });
      }
      await canvas.write(path.join(defaultSplashDir, 'screen.png'));
      console.log(`[Splash] Generated default fallback: drawable/screen.png`);
    }
  }
  
  console.log('--- Mobil Resim Üretim Adımları Tamamlandı ---');
}

generate().catch(console.error);
