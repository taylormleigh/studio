// run in terminal with: npx tsx generategif.ts

import { createCanvas, loadImage } from '@napi-rs/canvas';
import GIFEncoder from 'gifencoder';
import * as fs from 'fs';
import * as path from 'path';

// Settings
const width = 1920;
const height = 800;
const outputGifPath = './screenshots.gif';
const imagesDir = './test-results';

// 🔽 Only these files will be included (in this order)
const selectedFiles = [
  'tablet-solitaire-light-color.png',
  'tablet-solitaire-light-greyscale.png',
  'tablet-solitaire-dark-greyscale.png',
  'tablet-solitaire-dark-color.png',
  'tablet-freecell-dark-color.png',
  'tablet-freecell-dark-greyscale.png',
  'tablet-freecell-light-greyscale.png',
  'tablet-freecell-light-color.png',
  'tablet-spider-light-color.png',
  'tablet-spider-light-greyscale.png',
  'tablet-spider-dark-greyscale.png',
  'tablet-spider-dark-color.png',
];

async function generateGif() {
  const encoder = new GIFEncoder(width, height);
  encoder.createReadStream().pipe(fs.createWriteStream(outputGifPath));

  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(200);
  encoder.setQuality(1); // Max quality is 1

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  for (const file of selectedFiles) {
    const imagePath = path.join(imagesDir, file);
    if (!fs.existsSync(imagePath)) {
      console.warn(`⚠️  File not found: ${file} — skipping`);
      continue;
    }

    const image = await loadImage(imagePath);
    ctx.clearRect(0, 0, width, height);

    const imgAspect = image.width / image.height;
    const canvasAspect = width / height;

    let sx = 0, sy = 0, sw = image.width, sh = image.height;

    if (imgAspect > canvasAspect) {
      sw = image.height * canvasAspect;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / canvasAspect;
      // sy = (image.height - sh) / 2; // vertical-centered crop
      sy = 0; // anchor crop at top
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  console.log(`✅ GIF generated at ${outputGifPath}`);
}

generateGif().catch((err) => console.error(err));
