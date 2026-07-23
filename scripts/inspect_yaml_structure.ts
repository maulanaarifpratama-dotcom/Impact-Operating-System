import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

const projDir = 'c:/Users/maula/.gemini/antigravity/scratch/impactory';

function inspect(file: string) {
  const content = fs.readFileSync(path.join(projDir, 'ontology', file), 'utf-8');
  const parsed = parse(content);
  const items = Array.isArray(parsed) ? parsed : Object.values(parsed)[0] as any[];
  console.log(`\n=== ${file} (${items.length} items) ===`);
  if (items.length > 0) {
    console.log('Keys of item 0:', Object.keys(items[0]));
    console.log('Sample item 0:', JSON.stringify(items[0], null, 2));
  }
}

inspect('sectors.yaml');
inspect('problem-families.yaml');
inspect('outcome-families.yaml');
inspect('actors.yaml');
inspect('archetypes.yaml');
inspect('indicators.yaml');
