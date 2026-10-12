import { readFileSync } from 'fs';
import { join } from 'path';

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');

describe("point d'entrée de l'app", () => {
  it('package.json pointe sur index.ts', () => {
    expect(JSON.parse(read('package.json')).main).toBe('index.ts');
  });

  it("enregistre la tâche de geofencing AVANT de lancer expo-router", () => {
    const source = read('index.ts');
    const task = source.indexOf("import './src/services/terrainGeofenceTask'");
    const router = source.indexOf("import 'expo-router/entry'");
    expect(task).toBeGreaterThanOrEqual(0);
    expect(router).toBeGreaterThan(task);
  });
});
