import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const copies = [
  ['src/modules/crop-recommendation/knowledge/crops', 'dist/modules/crop-recommendation/knowledge/crops', '.json'],
  ['src/modules/crop-recommendation/knowledge/calibration', 'dist/modules/crop-recommendation/knowledge/calibration', '.json'],
  ['src/modules/database/migrations', 'dist/modules/database/migrations', '.sql'],
];

for (const [source, destination, extension] of copies) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isFile() && path.extname(entry.name) === extension) {
      await cp(path.join(source, entry.name), path.join(destination, entry.name));
    }
  }
}
