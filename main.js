import { preloadAssets, svgToDataURL } from './assets.js';
import RaycastEngine from './engine.js';
import { MapEditor } from './editor.js';
import { HADManager, createDemoHADWithSeeds } from './had.js';
import { compressSeed, decompressSeed, validateSeed, cloneSeed } from './seed.js';

class GameApp {
    constructor() {
        this.gameCanvas = document.getElementById('gameCanvas');
        this.editorCanvas = document.getElementById('editorCanvas');
        this.cutsceneCanvas = document.getElementById('cutsceneCanvas');
        
        this.assets = null;
        this.engine = null;
        this.editor = null;
        this.hadManager = new HADManager();
        
        this.state = 'menu'; // menu, playing, editor, cutscene, loading
        this.currentHAD = null;
        this.currentSceneIndex = 0;
        
        this.loadProgress = 0;
        this.loadText = 'Initializing...';
        
        this.init();
    }
    
    async init() {
        try {
            this.updateLoad(10, 'Loading assets...');
            this.assets = await preloadAssets();
            
            this.updateLoad(30, 'Preparing weapon sprites...');
            this.prepareWeaponImages();
            
            this.updateLoad(50, 'Initializing engine...');
            this.engine = new RaycastEngine(this.gameCanvas, this.assets);
            this.engine.onLevelComplete = (nextLevel) => this.onLevelComplete(nextLevel);
            
            this.updateLoad(70, 'Initializing editor...');
            this.editor = new MapEditor(
                this.editorCanvas,
                this.assets,
                () => this.exitEditor(),
                (seed) => this.testLevel(seed),
                () => this.saveSeedFromEditor(),
                () => this.loadSeedFromEditor(),
                (had) => this.exportHADFromEditor(had)
            );
            
            this.updateLoad(90, 'Setting up UI...');
            this.bindMainMenu();
            
            this.updateLoad(100, 'Ready!');
            await this.delay(500);
            this.hideLoadScreen();
            this.showMainMenu();
            
        } catch (e) {
            console.error('Init error:', e);
            this.loadText = 'Error: ' + e.message;
            document.getElementById('loadFill').style.background = '#F00';
        }
    }
    
    prepareWeaponImages() {
        const weaponSprite = document.getElementById('weaponSprite');
        const weaponKeys = ['player_fist', 'weapon_pistol', 'weapon_shotgun', 'weapon_chaingun'];
        
        weaponKeys.forEach(key => {
            if (this.assets[key]) {
                this.assets[key].dataURL = this.assets[key].toDataURL();
            }
        });
    }
    
    updateLoad(percent, text) {
        this.loadProgress = percent;
        this.loadText = text;
        document.getElementById('loadFill').style.width = percent + '%';
        document.getElementById('loadText').textContent = text;
    }
    
    hideLoadScreen() {
        document.getElementById('loadScreen').classList.add('hidden');
    }
    
    showLoadScreen(text = 'Loading...') {
        document.getElementById('loadScreen').classList.remove('hidden');
        document.getElementById('loadFill').style.width = '0%';
        document.getElementById('loadText').textContent = text;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    bindMainMenu() {
        document.getElementById('btnNewGame').addEventListener('click', () => this.startNewGame());
        document.getElementById('btnLoadHAD').addEventListener('click', () => this.loadHADFile());
        document.getElementById('btnEditor').addEventListener('click', () => this.openEditor());
        document.getElementById('btnCutsceneEditor').addEventListener('click', () => this.openCutsceneEditor());
        document.getElementById('hadFileInput').addEventListener('change', (e) => this.onHADFileSelected(e));
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    onResize() {
        if (this.engine) this.engine.resize();
        if (this.editor) this.editor.resize();
        if (this.state === 'cutscene') {
            this.cutsceneCanvas.width = window.innerWidth;
            this.cutsceneCanvas.height = window.innerHeight;
        }
    }
    
    showMainMenu() {
        this.state = 'menu';
        document.getElementById('mainMenu').style.display = 'block';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('weaponSprite').style.display = 'none';
        document.getElementById('editorUI').classList.remove('active');
        document.getElementById('cutsceneEditor').classList.remove('active');
        this.gameCanvas.style.display = 'none';
        this.editorCanvas.style.display = 'none';
        this.editor.stop();
    }
    
    hideMainMenu() {
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('weaponSprite').style.display = 'block';
    }
    
    async startNewGame() {
        try {
            if (!this.currentHAD) {
                this.showLoadScreen('Generating demo game...');
                this.currentHAD = await createDemoHADWithSeeds();
            }
            this.currentSceneIndex = 0;
            await this.loadScene(0);
        } catch (e) {
            console.error('Failed to start new game:', e);
            this.showMessage('Error starting game: ' + e.message);
            this.hideLoadScreen();
            this.showMainMenu();
        }
    }
    
    async loadHADFile() {
        document.getElementById('hadFileInput').click();
    }
    
    async onHADFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        this.showLoadScreen('Loading .HAD file...');
        try {
            this.currentHAD = await this.hadManager.loadHADFile(file);
            this.currentSceneIndex = 0;
            this.showMainMenu();
            this.showMessage(`Loaded: ${this.currentHAD['game-name']}`);
            
            const menuOptions = this.hadManager.getMenuOptions();
            if (menuOptions.length > 0) {
                const startScene = this.hadManager.getStartScene(menuOptions[0]);
                if (startScene) {
                    const idx = this.currentHAD.scenes.findIndex(s => s.scene === startScene.scene);
                    if (idx >= 0) await this.loadScene(idx);
                }
            }
        } catch (err) {
            this.showMessage('Error loading HAD: ' + err.message);
            this.hideLoadScreen();
        }
        e.target.value = '';
    }
    
    async loadScene(sceneIndex) {
        if (!this.currentHAD || sceneIndex >= this.currentHAD.scenes.length) {
            this.hideLoadScreen();
            return;
        }
        
        this.showLoadScreen(`Loading ${this.currentHAD.scenes[sceneIndex].title}...`);
        
        this.currentSceneIndex = sceneIndex;
        const scene = this.currentHAD.scenes[sceneIndex];
        
        try {
            if (scene['seed-key'] && typeof scene['seed-key'] === 'string') {
                const seed = await decompressSeed(scene['seed-key']);
                if (seed.type === 'cutscene') {
                    this.playCutscene(seed);
                    return;
                }
                await this.engine.loadSeed(seed);
                this.startPlaying();
            } else if (this.currentHAD._demoSeed && sceneIndex === 0) {
                await this.engine.loadSeed(this.currentHAD._demoSeed);
                this.startPlaying();
            } else {
                throw new Error('No seed data for this scene');
            }
        } catch (e) {
            console.error('Failed to load seed:', e);
            this.showMessage('Error loading level: ' + e.message);
            this.showMainMenu();
        } finally {
            this.hideLoadScreen();
        }
    }
    
    startPlaying() {
        this.state = 'playing';
        this.hideMainMenu();
        this.gameCanvas.style.display = 'block';
        this.editorCanvas.style.display = 'none';
        this.engine.resize();
        this.engine.start();
        this.showMessage(`LEVEL: ${this.currentHAD.scenes[this.currentSceneIndex].title}`);
    }
    
    onLevelComplete(nextLevel) {
        if (nextLevel === 'ENDGAME') {
            this.showMessage('GAME COMPLETE!');
            setTimeout(() => this.showMainMenu(), 3000);
        } else {
            const nextIndex = this.currentHAD.scenes.findIndex(s => s.scene === nextLevel);
            if (nextIndex >= 0) {
                this.loadScene(nextIndex);
            } else {
                this.showMessage(`Next level "${nextLevel}" not found!`);
                setTimeout(() => this.showMainMenu(), 2000);
            }
        }
    }
    
    playCutscene(cutsceneData) {
        this.state = 'cutscene';
        this.hideMainMenu();
        this.gameCanvas.style.display = 'none';
        this.editorCanvas.style.display = 'none';
        this.cutsceneCanvas.style.display = 'block';
        this.cutsceneCanvas.width = window.innerWidth;
        this.cutsceneCanvas.height = window.innerHeight;
        
        const ctx = this.cutsceneCanvas.getContext('2d');
        const bg = this.assets[cutsceneData.background] || this.assets['sky_base'];
        
        let lineIndex = 0;
        let charIndex = 0;
        let lastTime = 0;
        let finished = false;
        let skipRequested = false;
        
        const render = (time) => {
            if (!time) time = performance.now();
            if (!lastTime) lastTime = time;
            const dt = time - lastTime;
            lastTime = time;
            
            const w = this.cutsceneCanvas.width = window.innerWidth;
            const h = this.cutsceneCanvas.height = window.innerHeight;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            
            if (bg) {
                ctx.drawImage(bg, 0, 0, w, h);
            }
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, w, h);
            
            if (lineIndex < cutsceneData.lines.length) {
                const line = cutsceneData.lines[lineIndex];
                const elapsed = time - (line.startTime || time);
                
                if (elapsed > line.delay) {
                    const text = line.text;
                    const speed = 30;
                    charIndex = Math.min(text.length, Math.floor(elapsed / speed));
                    
                    ctx.fillStyle = '#0F0';
                    ctx.font = '24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(text.slice(0, charIndex), w/2, h/2 + lineIndex * 40);
                    
                    if (charIndex >= text.length) {
                        lineIndex++;
                        charIndex = 0;
                    }
                }
            } else {
                finished = true;
                ctx.fillStyle = '#0F0';
                ctx.font = '18px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Click or press any key to continue...', w/2, h - 50);
            }
            
            if (!finished && !skipRequested) {
                requestAnimationFrame(render);
            } else if (finished || skipRequested) {
                this.onCutsceneComplete();
            }
        };
        
        const handleSkip = () => {
            skipRequested = true;
            document.removeEventListener('click', handleSkip);
            document.removeEventListener('keydown', handleSkip);
        };
        
        document.addEventListener('click', handleSkip);
        document.addEventListener('keydown', handleSkip);
        
        cutsceneData.lines.forEach((line, i) => {
            line.startTime = performance.now() + line.delay;
        });
        
        requestAnimationFrame(render);
    }
    
    onCutsceneComplete() {
        this.cutsceneCanvas.style.display = 'none';
        this.gotoNextScene();
    }
    
    gotoNextScene() {
        const current = this.currentHAD.scenes[this.currentSceneIndex];
        if (current['end-goto'] === 'ENDGAME') {
            this.showMessage('GAME COMPLETE! Thanks for playing!');
            setTimeout(() => this.showMainMenu(), 3000);
        } else {
            const nextIndex = this.currentHAD.scenes.findIndex(s => s.scene === current['end-goto']);
            if (nextIndex >= 0) {
                this.loadScene(nextIndex);
            } else {
                this.showMessage(`Next scene "${current['end-goto']}" not found!`);
                setTimeout(() => this.showMainMenu(), 2000);
            }
        }
    }
    
    openEditor() {
        this.state = 'editor';
        this.hideMainMenu();
        this.gameCanvas.style.display = 'none';
        this.editorCanvas.style.display = 'block';
        document.getElementById('editorUI').classList.add('active');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('weaponSprite').style.display = 'none';
        this.editor.start();
    }
    
    exitEditor() {
        this.showMainMenu();
    }
    
    testLevel(seed) {
        // Ensure player start exists
        if (!seed.player || seed.player.sector === undefined) {
            const firstSector = seed.sectors[0];
            if (firstSector && firstSector.vertices.length >= 3) {
                const v0 = seed.vertices[firstSector.vertices[0]];
                const v1 = seed.vertices[firstSector.vertices[1]];
                const v2 = seed.vertices[firstSector.vertices[2]];
                const cx = (v0.x + v1.x + v2.x) / 3;
                const cy = (v0.y + v1.y + v2.y) / 3;
                seed.player = { x: cx, y: cy, z: 0, angle: 0, sector: 0 };
            } else {
                seed.player = { x: 0, y: 0, z: 0, angle: 0, sector: 0 };
            }
        }
        this.engine.loadSeed(seed).then(() => {
            this.state = 'playing';
            this.gameCanvas.style.display = 'block';
            this.editorCanvas.style.display = 'none';
            document.getElementById('editorUI').classList.remove('active');
            this.engine.resize();
            this.engine.start();
        });
    }
    
    saveSeedFromEditor() {
        const seed = this.editor.getSeed();
        this.editor.saveSeed();
    }
    
    loadSeedFromEditor() {
        this.editor.loadSeedPrompt();
    }
    
    exportHADFromEditor(had) {
        const seed = this.editor.getSeed();
        compressSeed(seed).then(seedKey => {
            had.scenes[0]['seed-key'] = seedKey;
            this.hadManager.downloadHAD(had, had['game-name'] + '.had');
            this.editor.showMessage('Exported .HAD file!');
        });
    }
    
    openCutsceneEditor() {
        this.showMessage('Cutscene editor coming soon!');
    }
    
    showMessage(msg) {
        if (this.engine) this.engine.addMessage(msg);
        
        const log = document.getElementById('messageLog');
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = msg;
        log.appendChild(div);
        setTimeout(() => div.classList.add('fade'), 2500);
        setTimeout(() => div.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
});

export { GameApp };