const SEED_VERSION = 1;
const SEED_PREFIX = 'HAD1:';

export async function compressSeed(data) {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const uint8 = encoder.encode(json);
    
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    await writer.write(uint8);
    await writer.close();
    
    const compressed = await new Response(cs.readable).arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    return SEED_PREFIX + base64;
}

export async function decompressSeed(seedKey) {
    if (!seedKey.startsWith(SEED_PREFIX)) {
        throw new Error('Invalid seed key format');
    }
    const base64 = seedKey.slice(SEED_PREFIX.length)
        .replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    
    const decompressed = await new Response(ds.readable).arrayBuffer();
    const json = new TextDecoder().decode(decompressed);
    return JSON.parse(json);
}

export function createEmptySeed(name = 'Untitled Level') {
    return {
        v: SEED_VERSION,
        name,
        player: { x: 0, y: 0, z: 0, angle: 0, sector: 0 },
        sectors: [],
        vertices: [],
        walls: [],
        things: [],
        textures: {},
        skybox: null,
        settings: {
            fogColor: '#000000',
            fogDistance: 1000,
            ambientLight: '#333333',
            reloadEnabled: true
        }
    };
}

export function validateSeed(seed) {
    if (!seed || seed.v !== SEED_VERSION) return false;
    if (!Array.isArray(seed.sectors) || !Array.isArray(seed.vertices) || 
        !Array.isArray(seed.walls) || !Array.isArray(seed.things)) return false;
    return true;
}

export function cloneSeed(seed) {
    return JSON.parse(JSON.stringify(seed));
}