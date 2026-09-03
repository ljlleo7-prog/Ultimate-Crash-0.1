import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'AIP_DATA', 'supabase_csv');
const targetDir = path.join(rootDir, 'public', 'AIP_DATA', 'supabase_csv');
const manifestFile = path.join(targetDir, 'manifest.json');
const shouldClean = process.argv.includes('--clean');

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const copyRuntimeCsvAssets = async () => {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const csvFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.csv'))
    .map((entry) => entry.name)
    .sort();

  if (!csvFiles.length) {
    throw new Error(`No CSV files found in ${sourceDir}`);
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  const files = [];
  const totals = { rawBytes: 0, gzipBytes: 0, brotliBytes: 0 };

  for (const fileName of csvFiles) {
    const sourceFile = path.join(sourceDir, fileName);
    const targetFile = path.join(targetDir, fileName);
    const data = await fs.readFile(sourceFile);
    const [gzipped, brotlied] = await Promise.all([
      gzipAsync(data),
      brotliCompressAsync(data)
    ]);

    await fs.writeFile(targetFile, data);

    const fileStats = {
      file: fileName,
      rawBytes: data.byteLength,
      gzipBytes: gzipped.byteLength,
      brotliBytes: brotlied.byteLength
    };
    files.push(fileStats);
    totals.rawBytes += fileStats.rawBytes;
    totals.gzipBytes += fileStats.gzipBytes;
    totals.brotliBytes += fileStats.brotliBytes;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: path.relative(rootDir, sourceDir),
    targetDir: path.relative(rootDir, targetDir),
    fileCount: files.length,
    totals,
    files
  };

  await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

const printReport = (manifest) => {
  console.log(`Copied ${manifest.fileCount} local AIP CSV files to ${manifest.targetDir}`);
  console.log('');
  console.log('File storage:');
  for (const file of manifest.files) {
    console.log(`  ${file.file}: raw ${formatBytes(file.rawBytes)}, gzip ${formatBytes(file.gzipBytes)}, brotli ${formatBytes(file.brotliBytes)}`);
  }
  console.log('');
  console.log(`Total raw: ${formatBytes(manifest.totals.rawBytes)} (${manifest.totals.rawBytes.toLocaleString()} bytes)`);
  console.log(`Total gzip: ${formatBytes(manifest.totals.gzipBytes)} (${manifest.totals.gzipBytes.toLocaleString()} bytes)`);
  console.log(`Total brotli: ${formatBytes(manifest.totals.brotliBytes)} (${manifest.totals.brotliBytes.toLocaleString()} bytes)`);
};

try {
  if (shouldClean) {
    await fs.rm(path.join(rootDir, 'public', 'AIP_DATA'), { recursive: true, force: true });
    console.log('Removed public/AIP_DATA local AIP assets');
  } else {
    printReport(await copyRuntimeCsvAssets());
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
