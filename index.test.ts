import { readFileSync } from 'fs';
import { join } from 'path';

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');

describe("point d'entrée de l'app", () => {
  it('package.json pointe sur index.ts', () => {
    expect(JSON.parse(read('package.json')).main).toBe('index.ts');
  });
});
