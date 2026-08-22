import { compressSeed } from './seed.js';
import { createDemoHADWithSeeds } from './had.js';
import fs from 'fs';

async function generateDemo() {
    const had = await createDemoHADWithSeeds();
    const json = JSON.stringify(had, null, 2);
    fs.writeFileSync('demo.had', json);
    console.log('Generated demo.had');
    console.log('File size:', json.length, 'bytes');
}

generateDemo().catch(console.error);