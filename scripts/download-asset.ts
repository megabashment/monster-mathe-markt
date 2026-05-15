import https from 'https';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const [url, fileName] = args;

if (!url || !fileName) {
  console.error('Usage: npx ts-node scripts/download-asset.ts <url> <fileName>');
  console.error('Example: npx ts-node scripts/download-asset.ts https://example.com/image.png monsters/my-monster.png');
  process.exit(1);
}

const filePath = path.join(process.cwd(), 'public/assets', fileName);
const dir = path.dirname(filePath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const file = fs.createWriteStream(filePath);

https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log(`✓ Downloaded: ${filePath}`);
  });
}).on('error', (err) => {
  fs.unlink(filePath, () => {});
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
