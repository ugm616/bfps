import { compressSeed, decompressSeed, validateSeed, cloneSeed } from './seed.js';

export class HADManager {
    constructor() {
        this.currentGame = null;
        this.currentSceneIndex = 0;
    }
    
    parseHAD(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            return this.validateHAD(data);
        } catch (e) {
            throw new Error('Invalid HAD file: ' + e.message);
        }
    }
    
    validateHAD(data) {
        if (!data['game-name']) throw new Error('Missing game-name');
        if (!Array.isArray(data.scenes)) throw new Error('Missing or invalid scenes array');
        
        for (let i = 0; i < data.scenes.length; i++) {
            const scene = data.scenes[i];
            if (!scene.scene) throw new Error(`Scene ${i} missing 'scene' field`);
            if (!scene['start-from']) throw new Error(`Scene ${i} missing 'start-from' field`);
            if (!scene['end-goto']) throw new Error(`Scene ${i} missing 'end-goto' field`);
        }
        
        return data;
    }
    
    async loadHADFile(file) {
        const text = await file.text();
        const had = this.parseHAD(text);
        this.currentGame = had;
        this.currentSceneIndex = 0;
        return had;
    }
    
    async loadHADFromText(text) {
        const had = this.parseHAD(text);
        this.currentGame = had;
        this.currentSceneIndex = 0;
        return had;
    }
    
    getCurrentScene() {
        if (!this.currentGame) return null;
        return this.currentGame.scenes[this.currentSceneIndex];
    }
    
    getSceneByName(name) {
        if (!this.currentGame) return null;
        return this.currentGame.scenes.find(s => s.scene === name);
    }
    
    async loadSceneSeed(scene) {
        if (!scene['seed-key']) return null;
        return await decompressSeed(scene['seed-key']);
    }
    
    gotoScene(sceneName) {
        if (!this.currentGame) return false;
        
        const index = this.currentGame.scenes.findIndex(s => s.scene === sceneName);
        if (index >= 0) {
            this.currentSceneIndex = index;
            return true;
        }
        return false;
    }
    
    gotoNextScene() {
        const current = this.getCurrentScene();
        if (!current) return false;
        
        if (current['end-goto'] === 'ENDGAME') {
            this.showEndGame();
            return false;
        }
        
        return this.gotoScene(current['end-goto']);
    }
    
    showEndGame() {
        alert('GAME COMPLETE! Thanks for playing!');
    }
    
    createHAD(gameName, scenes, options = {}) {
        const had = {
            'game-name': gameName,
            'menu-options': options.menuOptions || 'start game, options',
            scenes: scenes.map(s => ({
                scene: s.scene,
                title: s.title || '',
                'start-from': s.startFrom || 'start game',
                'seed-key': s.seedKey || '',
                'end-goto': s.endGoto || 'ENDGAME'
            })),
            reload: options.reload || 'on'
        };
        return had;
    }
    
    async generateHADFile(gameName, scenes, options = {}) {
        const had = this.createHAD(gameName, scenes, options);
        
        for (const scene of had.scenes) {
            if (scene['seed-key'] && typeof scene['seed-key'] === 'object') {
                scene['seed-key'] = await compressSeed(scene['seed-key']);
            }
        }
        
        return JSON.stringify(had, null, 2);
    }
    
    downloadHAD(had, filename) {
        const json = JSON.stringify(had, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.had') ? filename : filename + '.had';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    getMenuOptions() {
        if (!this.currentGame) return [];
        return this.currentGame['menu-options'].split(',').map(s => s.trim());
    }
    
    getStartScene(menuOption) {
        if (!this.currentGame) return null;
        return this.currentGame.scenes.find(s => s['start-from'] === menuOption);
    }
}

export function createDemoHAD() {
    const demoLevel = {
        v: 1,
        name: 'Demo Level',
        player: { x: 0, y: 0, z: 0, angle: 0, sector: 0 },
        sectors: [
            {
                vertices: [0, 1, 2, 3],
                walls: [0, 1, 2, 3],
                floorHeight: 0,
                ceilHeight: 128,
                floorTexture: 'floor_concrete',
                ceilTexture: 'ceiling_tiles',
                floorColor: '#2A2A2A',
                ceilColor: '#1A1A1A',
                lightLevel: 1,
                flicker: false
            },
            {
                vertices: [4, 5, 6, 7],
                walls: [4, 5, 6, 7],
                floorHeight: 0,
                ceilHeight: 128,
                floorTexture: 'floor_concrete',
                ceilTexture: 'ceiling_tiles',
                floorColor: '#2A2A2A',
                ceilColor: '#1A1A1A',
                lightLevel: 0.8,
                flicker: true
            }
        ],
        vertices: [
            { x: -256, y: -256 }, { x: 256, y: -256 }, { x: 256, y: 256 }, { x: -256, y: 256 },
            { x: 256, y: -256 }, { x: 768, y: -256 }, { x: 768, y: 256 }, { x: 256, y: 256 }
        ],
        walls: [
            { v1: 0, v2: 1, texture: 'wall_tech', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A', portal: 1 },
            { v1: 1, v2: 2, texture: 'wall_brick', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' },
            { v1: 2, v2: 3, texture: 'wall_brick', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' },
            { v1: 3, v2: 0, texture: 'wall_brick', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' },
            { v1: 4, v2: 5, texture: 'wall_metal', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' },
            { v1: 5, v2: 6, texture: 'wall_metal', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' },
            { v1: 6, v2: 7, texture: 'wall_metal', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A', portal: 0 },
            { v1: 7, v2: 4, texture: 'wall_metal', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A' }
        ],
        things: [
            { type: 'player', x: 0, y: 0, sector: 0 },
            { type: 'enemy_grunt', x: 400, y: 0, sector: 1, angle: Math.PI },
            { type: 'enemy_imp', x: 500, y: 100, sector: 1, angle: -Math.PI/2 },
            { type: 'pickup_health', x: 100, y: 100, sector: 0 },
            { type: 'pickup_armor', x: -100, y: -100, sector: 0 },
            { type: 'weapon_shotgun', x: 300, y: -100, sector: 1 },
            { type: 'pickup_ammo_pistol', x: 600, y: -100, sector: 1 }
        ],
        settings: {
            fogColor: '#000000',
            fogDistance: 1000,
            ambientLight: '#333333',
            reloadEnabled: true
        }
    };
    
    return {
        'game-name': 'HAD ENGINE DEMO',
        'menu-options': 'start game, options',
        scenes: [
            {
                scene: 'level_1',
                title: 'Level 1 - Entry Point',
                'start-from': 'start game',
                'seed-key': null,
                'end-goto': 'cutscene_1'
            },
            {
                scene: 'cutscene_1',
                title: 'The Journey Begins',
                'start-from': 'level_1',
                'seed-key': null,
                'end-goto': 'ENDGAME'
            }
        ],
        reload: 'on',
        _demoSeed: demoLevel
    };
}

export async function createDemoHADWithSeeds() {
    const had = createDemoHAD();
    const demoSeed = had._demoSeed;
    delete had._demoSeed;
    
    had.scenes[0]['seed-key'] = await compressSeed(demoSeed);
    had.scenes[1]['seed-key'] = await compressSeed({
        v: 1,
        name: 'Cutscene 1',
        type: 'cutscene',
        background: 'sky_base',
        lines: [
            { text: 'You have entered the facility...', delay: 1000 },
            { text: 'The demons have taken over.', delay: 2000 },
            { text: 'Find the exit and escape.', delay: 3000 },
            { text: 'Good luck, marine.', delay: 4000 }
        ]
    });
    
    return had;
}