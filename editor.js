import { createEmptySeed, compressSeed, decompressSeed, validateSeed, cloneSeed } from './seed.js';
import { DEFAULT_SVG_ASSETS, svgToDataURL } from './assets.js';

const GRID_SIZE = 64;
const SNAP_DIST = 16;

const TOOL_TYPES = {
    select: { cursor: 'default', name: 'Select' },
    vertex: { cursor: 'crosshair', name: 'Add Vertex' },
    wall: { cursor: 'crosshair', name: 'Draw Wall' },
    sector: { cursor: 'crosshair', name: 'Create Sector' },
    player: { cursor: 'crosshair', name: 'Player Start' },
    enemy: { cursor: 'crosshair', name: 'Place Enemy' },
    pickup: { cursor: 'crosshair', name: 'Place Pickup' },
    weapon: { cursor: 'crosshair', name: 'Place Weapon' },
    light: { cursor: 'crosshair', name: 'Light Source' },
    portal: { cursor: 'crosshair', name: 'Create Portal' }
};

const ENEMY_TYPES = ['enemy_grunt', 'enemy_imp', 'enemy_demon'];
const PICKUP_TYPES = ['pickup_health', 'pickup_armor', 'pickup_ammo_pistol', 'pickup_ammo_shells'];
const WEAPON_TYPES = ['weapon_shotgun', 'weapon_chaingun'];
const TEXTURE_TYPES = ['wall_tech', 'wall_brick', 'wall_metal'];
const FLOOR_TYPES = ['floor_concrete', 'floor_lava'];
const CEIL_TYPES = ['ceiling_tiles'];

export class MapEditor {
    constructor(canvas, assets, onExit, onTest, onSaveSeed, onLoadSeed, onExportHAD) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.onExit = onExit;
        this.onTest = onTest;
        this.onSaveSeed = onSaveSeed;
        this.onLoadSeed = onLoadSeed;
        this.onExportHAD = onExportHAD;
        
        this.seed = createEmptySeed('New Level');
        this.tool = 'select';
        this.dragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragTarget = null;
        this.dragVertex = null;
        this.dragWall = null;
        this.creatingSector = [];
        this.drawingWall = null;
        this.creatingPortal = null;
        
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.cameraNeedsCentering = true;
        this.panning = false;
        this.panStart = { x: 0, y: 0 };
        
        this.selectedObject = null;
        this.selectedType = null;
        this.hoveredObject = null;
        
        this.width = 0;
        this.height = 0;
        this.resize();
        
        this.bindEvents();
        this.updateUI();
    }
    
    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
        });
        
        document.getElementById('btnTestLevel').addEventListener('click', () => this.ensurePlayerStartAndTest());
        document.getElementById('btnSaveSeed').addEventListener('click', () => this.saveSeed());
        document.getElementById('btnLoadSeed').addEventListener('click', () => this.loadSeedPrompt());
        document.getElementById('btnExportHAD').addEventListener('click', () => this.exportHAD());
        document.getElementById('btnExitEditor').addEventListener('click', () => this.onExit());
        
        document.getElementById('propContent').addEventListener('input', (e) => this.onPropertyChange(e));
        document.getElementById('propContent').addEventListener('change', (e) => this.onPropertyChange(e));
    }
    
    setTool(tool) {
        this.tool = tool;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        this.creatingSector = [];
        this.drawingWall = null;
        this.creatingPortal = null;
        this.updateUI();
    }
    
    onMouseDown(e) {
        const pos = this.screenToWorld(e.clientX, e.clientY);
        
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            this.panning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (e.button === 2) {
            this.cancelCurrentAction();
            return;
        }
        
        this.hoveredObject = this.findObjectAt(pos.x, pos.y);
        
        switch (this.tool) {
            case 'select':
                if (this.hoveredObject) {
                    this.selectObject(this.hoveredObject);
                    this.dragging = true;
                    this.dragStart = pos;
                    this.dragTarget = this.hoveredObject;
                } else {
                    this.selectObject(null);
                }
                break;
                
            case 'vertex':
                this.addVertex(pos.x, pos.y);
                break;
                
            case 'wall':
                if (!this.drawingWall) {
                    this.drawingWall = { x: pos.x, y: pos.y };
                } else {
                    this.addWall(this.drawingWall.x, this.drawingWall.y, pos.x, pos.y);
                    this.drawingWall = null;
                }
                break;
                
            case 'sector':
                this.creatingSector.push({ x: pos.x, y: pos.y });
                if (this.creatingSector.length >= 3) {
                    const first = this.creatingSector[0];
                    if (Math.hypot(pos.x - first.x, pos.y - first.y) < SNAP_DIST) {
                        this.createSectorFromVertices(this.creatingSector);
                        this.creatingSector = [];
                    }
                }
                break;
                
            case 'player':
                this.setPlayerStart(pos.x, pos.y);
                break;
                
            case 'enemy':
                this.addThing('enemy_grunt', pos.x, pos.y);
                break;
                
            case 'pickup':
                this.addThing('pickup_health', pos.x, pos.y);
                break;
                
            case 'weapon':
                this.addThing('weapon_shotgun', pos.x, pos.y);
                break;
                
            case 'light':
                this.addLight(pos.x, pos.y);
                break;
                
            case 'portal':
                if (!this.creatingPortal) {
                    const wall = this.findWallAt(pos.x, pos.y);
                    if (wall) {
                        this.creatingPortal = { wall, pos: { x: pos.x, y: pos.y } };
                    }
                } else {
                    const wall2 = this.findWallAt(pos.x, pos.y);
                    if (wall2 && wall2 !== this.creatingPortal.wall) {
                        this.createPortal(this.creatingPortal.wall, wall2);
                    }
                    this.creatingPortal = null;
                }
                break;
        }
        
        this.dragStart = pos;
        this.updateUI();
    }
    
    onMouseMove(e) {
        const pos = this.screenToWorld(e.clientX, e.clientY);
        
        if (this.panning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
            this.panStart = { x: e.clientX, y: e.clientY };
            return;
        }
        
        if (this.dragging && this.dragTarget) {
            this.dragObject(this.dragTarget, pos.x - this.dragStart.x, pos.y - this.dragStart.y);
            this.dragStart = pos;
            this.updateUI();
            return;
        }
        
        this.hoveredObject = this.findObjectAt(pos.x, pos.y);
        this.canvas.style.cursor = this.hoveredObject ? 'pointer' : TOOL_TYPES[this.tool]?.cursor || 'default';
    }
    
    onMouseUp(e) {
        if (this.panning) {
            this.panning = false;
            this.canvas.style.cursor = TOOL_TYPES[this.tool]?.cursor || 'default';
            return;
        }
        
        this.dragging = false;
        this.dragTarget = null;
        this.dragVertex = null;
        this.dragWall = null;
    }
    
    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldBefore = this.screenToWorld(mouseX, mouseY);
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
        
        const worldAfter = this.screenToWorld(mouseX, mouseY);
        this.camera.x += worldBefore.x - worldAfter.x;
        this.camera.y += worldBefore.y - worldAfter.y;
    }
    
    onKeyDown(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'v': case 'V': this.setTool('select'); break;
            case 'w': case 'W': this.setTool('wall'); break;
            case 's': case 'S': this.setTool('sector'); break;
            case 'p': case 'P': this.setTool('player'); break;
            case 'e': case 'E': this.setTool('enemy'); break;
            case 'u': case 'U': this.setTool('pickup'); break;
            case 'l': case 'L': this.setTool('light'); break;
            case 'o': case 'O': this.setTool('portal'); break;
            case 't': case 'T': this.onTest(this.getSeed()); break;
            case 'Escape': this.cancelCurrentAction(); break;
            case 'Delete': case 'Backspace': this.deleteSelected(); break;
            case 'Control': this.keys.ctrl = true; break;
        }
    }
    
    onKeyUp(e) {
        if (e.key === 'Control') this.keys.ctrl = false;
    }
    
    cancelCurrentAction() {
        this.creatingSector = [];
        this.drawingWall = null;
        this.creatingPortal = null;
        this.updateUI();
    }
    
    deleteSelected() {
        if (!this.selectedObject) return;
        
        const { type, index } = this.selectedObject;
        
        switch (type) {
            case 'vertex':
                this.deleteVertex(index);
                break;
            case 'wall':
                this.deleteWall(index);
                break;
            case 'sector':
                this.deleteSector(index);
                break;
            case 'thing':
                this.seed.things.splice(index, 1);
                break;
        }
        
        this.selectObject(null);
        this.updateUI();
    }
    
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.width / 2) / this.camera.zoom + this.camera.x,
            y: (sy - this.height / 2) / this.camera.zoom + this.camera.y
        };
    }
    
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.camera.x) * this.camera.zoom + this.width / 2,
            y: (wy - this.camera.y) * this.camera.zoom + this.height / 2
        };
    }
    
    snapToGrid(x, y) {
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE
        };
    }
    
    findObjectAt(x, y) {
        const threshold = 10 / this.camera.zoom;
        
        for (let i = this.seed.vertices.length - 1; i >= 0; i--) {
            const v = this.seed.vertices[i];
            if (Math.hypot(v.x - x, v.y - y) < threshold) {
                return { type: 'vertex', index: i };
            }
        }
        
        for (let i = this.seed.things.length - 1; i >= 0; i--) {
            const t = this.seed.things[i];
            if (Math.hypot(t.x - x, t.y - y) < threshold * 2) {
                return { type: 'thing', index: i };
            }
        }
        
        for (let i = 0; i < this.seed.walls.length; i++) {
            const wall = this.seed.walls[i];
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            if (!v1 || !v2) continue;
            
            const dist = this.pointLineDist(x, y, v1.x, v1.y, v2.x, v2.y);
            if (dist < threshold) {
                return { type: 'wall', index: i };
            }
        }
        
        for (let i = 0; i < this.seed.sectors.length; i++) {
            const sector = this.seed.sectors[i];
            if (this.pointInSector(x, y, sector)) {
                return { type: 'sector', index: i };
            }
        }
        
        return null;
    }
    
    findWallAt(x, y) {
        const threshold = 10 / this.camera.zoom;
        
        for (let i = 0; i < this.seed.walls.length; i++) {
            const wall = this.seed.walls[i];
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            if (!v1 || !v2) continue;
            
            const dist = this.pointLineDist(x, y, v1.x, v1.y, v2.x, v2.y);
            if (dist < threshold) return i;
        }
        return null;
    }
    
    pointLineDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.hypot(px - projX, py - projY);
    }
    
    pointInSector(x, y, sector) {
        const verts = sector.vertices.map(idx => this.seed.vertices[idx]).filter(v => v);
        if (verts.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const vi = verts[i], vj = verts[j];
            if (((vi.y > y) !== (vj.y > y)) &&
                (x < (vj.x - vi.x) * (y - vi.y) / (vj.y - vi.y) + vi.x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    selectObject(obj) {
        this.selectedObject = obj;
        this.updatePropertiesPanel();
    }
    
    addVertex(x, y) {
        const snapped = this.snapToGrid(x, y);
        const existing = this.seed.vertices.findIndex(v => v.x === snapped.x && v.y === snapped.y);
        if (existing >= 0) return existing;
        
        this.seed.vertices.push({ x: snapped.x, y: snapped.y });
        return this.seed.vertices.length - 1;
    }
    
    addWall(x1, y1, x2, y2) {
        const v1 = this.addVertex(x1, y1);
        const v2 = this.addVertex(x2, y2);
        if (v1 === v2) return;
        
        this.seed.walls.push({
            v1, v2,
            texture: 'wall_tech',
            floorColor: '#0A0A0A',
            ceilColor: '#1A1A1A',
            color: '#3A3A3A',
            portal: undefined
        });
    }
    
    createSectorFromVertices(vertices) {
        const indices = vertices.map(v => {
            const existing = this.seed.vertices.findIndex(vv => vv.x === v.x && vv.y === v.y);
            return existing >= 0 ? existing : this.seed.vertices.push(v) - 1;
        });
        
        const wallIndices = [];
        for (let i = 0; i < indices.length; i++) {
            const v1 = indices[i];
            const v2 = indices[(i + 1) % indices.length];
            
            let wallIdx = this.seed.walls.findIndex(w => 
                (w.v1 === v1 && w.v2 === v2) || (w.v1 === v2 && w.v2 === v1)
            );
            
            if (wallIdx < 0) {
                this.seed.walls.push({ v1, v2, texture: 'wall_tech', floorColor: '#0A0A0A', ceilColor: '#1A1A1A', color: '#3A3A3A', portal: undefined });
                wallIdx = this.seed.walls.length - 1;
            }
            wallIndices.push(wallIdx);
        }
        
        this.seed.sectors.push({
            vertices: indices,
            walls: wallIndices,
            floorHeight: 0,
            ceilHeight: 128,
            floorTexture: 'floor_concrete',
            ceilTexture: 'ceiling_tiles',
            floorColor: '#2A2A2A',
            ceilColor: '#1A1A1A',
            lightLevel: 1,
            flicker: false,
            exit: null
        });
    }
    
    setPlayerStart(x, y) {
        const sector = this.findSectorAt(x, y);
        this.seed.player = {
            x, y, z: 0, angle: 0,
            sector: sector ?? 0
        };
        this.showMessage(`Player start set at sector ${sector ?? 0}`);
    }
    
    findSectorAt(x, y) {
        for (let i = 0; i < this.seed.sectors.length; i++) {
            if (this.pointInSector(x, y, this.seed.sectors[i])) return i;
        }
        return null;
    }
    
    addThing(type, x, y) {
        const sector = this.findSectorAt(x, y) ?? 0;
        this.seed.things.push({ type, x, y, sector, angle: 0 });
        this.showMessage(`Placed ${type} in sector ${sector}`);
    }
    
    addLight(x, y) {
        const sector = this.findSectorAt(x, y) ?? 0;
        this.seed.things.push({ type: 'light', x, y, sector, color: '#FFFF00', radius: 256, intensity: 1 });
        this.showMessage(`Light placed in sector ${sector}`);
    }
    
    createPortal(wall1Idx, wall2Idx) {
        this.seed.walls[wall1Idx].portal = this.seed.walls[wall2Idx].sector;
        this.seed.walls[wall2Idx].portal = this.seed.walls[wall1Idx].sector;
        this.showMessage('Portal created between sectors');
    }
    
    deleteVertex(index) {
        this.seed.vertices.splice(index, 1);
        
        for (const wall of this.seed.walls) {
            if (wall.v1 > index) wall.v1--;
            if (wall.v2 > index) wall.v2--;
            if (wall.v1 === index || wall.v2 === index) wall.deleted = true;
        }
        this.seed.walls = this.seed.walls.filter(w => !w.deleted);
        
        for (const sector of this.seed.sectors) {
            sector.vertices = sector.vertices.filter(v => v !== index).map(v => v > index ? v - 1 : v);
            sector.walls = sector.walls.filter(w => !this.seed.walls[w]?.deleted).map(w => {
                const newIdx = this.seed.walls.findIndex(ow => ow === this.seed.walls[w]);
                return newIdx >= 0 ? newIdx : -1;
            }).filter(w => w >= 0);
        }
        this.seed.sectors = this.seed.sectors.filter(s => s.vertices.length >= 3);
    }
    
    deleteWall(index) {
        this.seed.walls.splice(index, 1);
        for (const sector of this.seed.sectors) {
            sector.walls = sector.walls.filter(w => w !== index).map(w => w > index ? w - 1 : w);
        }
    }
    
    deleteSector(index) {
        const sector = this.seed.sectors[index];
        const wallIndices = [...sector.walls];
        
        this.seed.sectors.splice(index, 1);
        
        for (const wallIdx of wallIndices) {
            let used = false;
            for (const s of this.seed.sectors) {
                if (s.walls.includes(wallIdx)) { used = true; break; }
            }
            if (!used) this.deleteWall(wallIdx);
        }
    }
    
    dragObject(obj, dx, dy) {
        switch (obj.type) {
            case 'vertex':
                this.seed.vertices[obj.index].x += dx;
                this.seed.vertices[obj.index].y += dy;
                break;
            case 'thing':
                this.seed.things[obj.index].x += dx;
                this.seed.things[obj.index].y += dy;
                this.seed.things[obj.index].sector = this.findSectorAt(
                    this.seed.things[obj.index].x, 
                    this.seed.things[obj.index].y
                ) ?? 0;
                break;
        }
    }
    
    updatePropertiesPanel() {
        const panel = document.getElementById('propContent');
        
        if (!this.selectedObject) {
            panel.innerHTML = '<div style="color:#888">Select an object to edit properties</div>';
            return;
        }
        
        const { type, index } = this.selectedObject;
        let html = '';
        
        switch (type) {
            case 'vertex':
                const v = this.seed.vertices[index];
                html = `
                    <div class="prop-row"><label>Vertex ${index}</label></div>
                    <div class="prop-row"><label>X</label><input type="number" data-prop="x" value="${v.x}" step="1"></div>
                    <div class="prop-row"><label>Y</label><input type="number" data-prop="y" value="${v.y}" step="1"></div>
                `;
                break;
                
            case 'wall':
                const wall = this.seed.walls[index];
                const v1 = this.seed.vertices[wall.v1];
                const v2 = this.seed.vertices[wall.v2];
                const wallTex = this.assets[wall.texture] ? wall.texture : 'wall_tech';
                html = `
                    <div class="prop-row"><label>Wall ${index}</label></div>
                    <div class="prop-row"><label>Texture</label>
                        <select data-prop="texture" id="wallTexSelect">
                            ${TEXTURE_TYPES.map(t => `<option value="${t}" ${wall.texture===t?'selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="prop-row">
                        <label>Preview</label>
                        <canvas id="wallTexPreview" width="64" height="64" style="border:1px solid #0F0;image-rendering:pixelated;"></canvas>
                    </div>
                    <div class="prop-row">
                        <label>Custom</label>
                        <input type="file" accept=".svg" id="wallTexUpload" style="font-size:10px;">
                    </div>
                    <div class="prop-row"><label>Color</label><input type="color" data-prop="color" value="${wall.color || '#3A3A3A'}"></div>
                    <div class="prop-row"><label>Floor Color</label><input type="color" data-prop="floorColor" value="${wall.floorColor || '#0A0A0A'}"></div>
                    <div class="prop-row"><label>Ceil Color</label><input type="color" data-prop="ceilColor" value="${wall.ceilColor || '#1A1A1A'}"></div>
                    <div class="prop-row"><label>Portal</label><input type="number" data-prop="portal" value="${wall.portal ?? ''}" placeholder="Sector ID"></div>
                `;
                break;
                
            case 'sector':
                const sector = this.seed.sectors[index];
                const floorTex = this.assets[sector.floorTexture] ? sector.floorTexture : 'floor_concrete';
                const ceilTex = this.assets[sector.ceilTexture] ? sector.ceilTexture : 'ceiling_tiles';
                html = `
                    <div class="prop-row"><label>Sector ${index}</label></div>
                    <div class="prop-row"><label>Floor H</label><input type="number" data-prop="floorHeight" value="${sector.floorHeight}" step="8"></div>
                    <div class="prop-row"><label>Ceil H</label><input type="number" data-prop="ceilHeight" value="${sector.ceilHeight}" step="8"></div>
                    <div class="prop-row"><label>Floor Tex</label>
                        <select data-prop="floorTexture" id="floorTexSelect">
                            ${FLOOR_TYPES.map(t => `<option value="${t}" ${sector.floorTexture===t?'selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="prop-row">
                        <label>Preview</label>
                        <canvas id="floorTexPreview" width="64" height="64" style="border:1px solid #0F0;image-rendering:pixelated;"></canvas>
                    </div>
                    <div class="prop-row">
                        <label>Custom</label>
                        <input type="file" accept=".svg" id="floorTexUpload" style="font-size:10px;">
                    </div>
                    <div class="prop-row"><label>Ceil Tex</label>
                        <select data-prop="ceilTexture" id="ceilTexSelect">
                            ${CEIL_TYPES.map(t => `<option value="${t}" ${sector.ceilTexture===t?'selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="prop-row">
                        <label>Preview</label>
                        <canvas id="ceilTexPreview" width="64" height="64" style="border:1px solid #0F0;image-rendering:pixelated;"></canvas>
                    </div>
                    <div class="prop-row">
                        <label>Custom</label>
                        <input type="file" accept=".svg" id="ceilTexUpload" style="font-size:10px;">
                    </div>
                    <div class="prop-row"><label>Floor Color</label><input type="color" data-prop="floorColor" value="${sector.floorColor || '#2A2A2A'}"></div>
                    <div class="prop-row"><label>Ceil Color</label><input type="color" data-prop="ceilColor" value="${sector.ceilColor || '#1A1A1A'}"></div>
                    <div class="prop-row"><label>Light</label><input type="range" data-prop="lightLevel" min="0" max="2" step="0.1" value="${sector.lightLevel || 1}"></div>
                    <div class="prop-row"><label>Flicker</label><input type="checkbox" data-prop="flicker" ${sector.flicker ? 'checked' : ''}></div>
                    <div class="prop-row"><label>Exit To</label><input type="text" data-prop="exit" value="${sector.exit || ''}" placeholder="level_name"></div>
                `;
                break;
                
            case 'thing':
                const thing = this.seed.things[index];
                let options = '';
                if (thing.type.startsWith('enemy_')) {
                    options = ENEMY_TYPES.map(t => `<option value="${t}" ${thing.type===t?'selected':''}>${t}</option>`).join('');
                } else if (thing.type.startsWith('pickup_')) {
                    options = PICKUP_TYPES.map(t => `<option value="${t}" ${thing.type===t?'selected':''}>${t}</option>`).join('');
                } else if (thing.type.startsWith('weapon_')) {
                    options = WEAPON_TYPES.map(t => `<option value="${t}" ${thing.type===t?'selected':''}>${t}</option>`).join('');
                }
                const thingTex = this.assets[thing.type] ? thing.type : 'enemy_grunt';
                html = `
                    <div class="prop-row"><label>Thing ${index}</label></div>
                    <div class="prop-row"><label>Type</label><select data-prop="type" id="thingTypeSelect">${options}</select></div>
                    <div class="prop-row">
                        <label>Preview</label>
                        <canvas id="thingTexPreview" width="64" height="64" style="border:1px solid #0F0;image-rendering:pixelated;"></canvas>
                    </div>
                    <div class="prop-row">
                        <label>Custom SVG</label>
                        <input type="file" accept=".svg" id="thingSvgUpload" style="font-size:10px;">
                    </div>
                    <div class="prop-row"><label>X</label><input type="number" data-prop="x" value="${thing.x}" step="1"></div>
                    <div class="prop-row"><label>Y</label><input type="number" data-prop="y" value="${thing.y}" step="1"></div>
                    <div class="prop-row"><label>Angle</label><input type="number" data-prop="angle" value="${thing.angle || 0}" step="0.1"></div>
                    ${thing.type === 'light' ? `
                        <div class="prop-row"><label>Color</label><input type="color" data-prop="color" value="${thing.color || '#FFFF00'}"></div>
                        <div class="prop-row"><label>Radius</label><input type="number" data-prop="radius" value="${thing.radius || 256}"></div>
                        <div class="prop-row"><label>Intensity</label><input type="range" data-prop="intensity" min="0" max="2" step="0.1" value="${thing.intensity || 1}"></div>
                    ` : ''}
                `;
                break;
        }
        
        panel.innerHTML = html;
        panel.querySelectorAll('[data-prop]').forEach(el => {
            el.dataset.index = index;
            el.dataset.type = type;
        });
        
        // Add texture preview and upload handlers
        this.setupTexturePreviews(type, index);
    }
    
    setupTexturePreviews(objType, objIndex) {
        // Wall texture preview
        const wallTexSelect = document.getElementById('wallTexSelect');
        const wallTexPreview = document.getElementById('wallTexPreview');
        const wallTexUpload = document.getElementById('wallTexUpload');
        if (wallTexSelect && wallTexPreview) {
            const drawWallPreview = () => {
                const tex = this.assets[wallTexSelect.value];
                if (tex) {
                    const ctx = wallTexPreview.getContext('2d');
                    ctx.drawImage(tex, 0, 0, 64, 64);
                }
            };
            wallTexSelect.addEventListener('change', drawWallPreview);
            drawWallPreview();
        }
        if (wallTexUpload) {
            wallTexUpload.addEventListener('change', (e) => this.handleSvgUpload(e, 'wall', objIndex, 'texture'));
        }
        
        // Floor texture preview
        const floorTexSelect = document.getElementById('floorTexSelect');
        const floorTexPreview = document.getElementById('floorTexPreview');
        const floorTexUpload = document.getElementById('floorTexUpload');
        if (floorTexSelect && floorTexPreview) {
            const drawFloorPreview = () => {
                const tex = this.assets[floorTexSelect.value];
                if (tex) {
                    const ctx = floorTexPreview.getContext('2d');
                    ctx.drawImage(tex, 0, 0, 64, 64);
                }
            };
            floorTexSelect.addEventListener('change', drawFloorPreview);
            drawFloorPreview();
        }
        if (floorTexUpload) {
            floorTexUpload.addEventListener('change', (e) => this.handleSvgUpload(e, 'sector', objIndex, 'floorTexture'));
        }
        
        // Ceiling texture preview
        const ceilTexSelect = document.getElementById('ceilTexSelect');
        const ceilTexPreview = document.getElementById('ceilTexPreview');
        const ceilTexUpload = document.getElementById('ceilTexUpload');
        if (ceilTexSelect && ceilTexPreview) {
            const drawCeilPreview = () => {
                const tex = this.assets[ceilTexSelect.value];
                if (tex) {
                    const ctx = ceilTexPreview.getContext('2d');
                    ctx.drawImage(tex, 0, 0, 64, 64);
                }
            };
            ceilTexSelect.addEventListener('change', drawCeilPreview);
            drawCeilPreview();
        }
        if (ceilTexUpload) {
            ceilTexUpload.addEventListener('change', (e) => this.handleSvgUpload(e, 'sector', objIndex, 'ceilTexture'));
        }
        
        // Thing texture preview
        const thingTypeSelect = document.getElementById('thingTypeSelect');
        const thingTexPreview = document.getElementById('thingTexPreview');
        const thingSvgUpload = document.getElementById('thingSvgUpload');
        if (thingTypeSelect && thingTexPreview) {
            const drawThingPreview = () => {
                const tex = this.assets[thingTypeSelect.value];
                if (tex) {
                    const ctx = thingTexPreview.getContext('2d');
                    ctx.drawImage(tex, 0, 0, 64, 64);
                }
            };
            thingTypeSelect.addEventListener('change', drawThingPreview);
            drawThingPreview();
        }
        if (thingSvgUpload) {
            thingSvgUpload.addEventListener('change', (e) => this.handleThingSvgUpload(e, objIndex));
        }
    }
    
    async handleSvgUpload(e, objType, objIndex, propName) {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        if (!text.includes('<svg')) {
            this.showMessage('Invalid SVG file');
            return;
        }
        
        // Generate a unique key for the custom SVG
        const key = `custom_${objType}_${objIndex}_${propName}_${Date.now()}`;
        this.assets[key] = await this.svgToImage(text, 128, 128);
        
        // Update the seed
        if (objType === 'wall') {
            this.seed.walls[objIndex][propName] = key;
        } else if (objType === 'sector') {
            this.seed.sectors[objIndex][propName] = key;
        }
        
        // Update the select dropdown to include the new custom texture
        const select = document.getElementById(`${propName === 'texture' ? 'wallTexSelect' : propName === 'floorTexture' ? 'floorTexSelect' : 'ceilTexSelect'}`);
        if (select) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `Custom: ${file.name}`;
            option.selected = true;
            select.appendChild(option);
        }
        
        this.showMessage(`Custom ${propName} uploaded: ${file.name}`);
        e.target.value = '';
    }
    
    async handleThingSvgUpload(e, objIndex) {
        const file = e.target.files[0];
        if (!file) return;
        
        const text = await file.text();
        if (!text.includes('<svg')) {
            this.showMessage('Invalid SVG file');
            return;
        }
        
        const key = `custom_thing_${objIndex}_${Date.now()}`;
        this.assets[key] = await this.svgToImage(text, 64, 128);
        
        // Change the thing type to use the custom SVG
        this.seed.things[objIndex].type = key;
        
        // Update the select dropdown
        const select = document.getElementById('thingTypeSelect');
        if (select) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `Custom: ${file.name}`;
            option.selected = true;
            select.appendChild(option);
        }
        
        this.showMessage(`Custom entity SVG uploaded: ${file.name}`);
        e.target.value = '';
    }
    
    svgToImage(svgString, width, height) {
        return new Promise((resolve) => {
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas);
            };
            img.src = url;
        });
    }
    
    onPropertyChange(e) {
        const target = e.target;
        const prop = target.dataset.prop;
        const index = parseInt(target.dataset.index);
        const type = target.dataset.type;
        if (prop === undefined || index === undefined) return;
        
        let value = target.type === 'checkbox' ? target.checked : 
                    target.type === 'number' || target.type === 'range' ? parseFloat(target.value) : target.value;
        
        switch (type) {
            case 'vertex':
                this.seed.vertices[index][prop] = value;
                this.cameraNeedsCentering = true;
                break;
            case 'wall':
                this.seed.walls[index][prop] = value;
                if (prop === 'portal' && value === '') value = undefined;
                this.cameraNeedsCentering = true;
                break;
            case 'sector':
                this.seed.sectors[index][prop] = value;
                this.cameraNeedsCentering = true;
                break;
            case 'thing':
                this.seed.things[index][prop] = value;
                this.cameraNeedsCentering = true;
                break;
        }
        
        // Refresh properties panel if it's a select change
        if (e.target.tagName === 'SELECT') {
            this.updatePropertiesPanel();
        }
    }
    
    updateUI() {
        this.updateLayersPanel();
    }
    
    updateLayersPanel() {
        const container = document.getElementById('layersContent');
        let html = '';
        
        html += '<div style="color:#0F0;margin-bottom:5px">SECTORS</div>';
        this.seed.sectors.forEach((s, i) => {
            const selected = this.selectedObject?.type === 'sector' && this.selectedObject.index === i;
            html += `<div class="layer-item" style="${selected?'background:#0F0;color:#000':''}" data-type="sector" data-index="${i}">Sector ${i} (${s.vertices.length} verts, floor:${s.floorHeight}, ceil:${s.ceilHeight})</div>`;
        });
        
        html += '<div style="color:#0F0;margin:10px 0 5px">WALLS</div>';
        this.seed.walls.forEach((w, i) => {
            const selected = this.selectedObject?.type === 'wall' && this.selectedObject.index === i;
            html += `<div class="layer-item" style="${selected?'background:#0F0;color:#000':''}" data-type="wall" data-index="${i}">Wall ${i}: v${w.v1}-v${w.v2} ${w.portal!==undefined?'→'+w.portal:''}</div>`;
        });
        
        html += '<div style="color:#0F0;margin:10px 0 5px">THINGS</div>';
        this.seed.things.forEach((t, i) => {
            const selected = this.selectedObject?.type === 'thing' && this.selectedObject.index === i;
            html += `<div class="layer-item" style="${selected?'background:#0F0;color:#000':''}" data-type="thing" data-index="${i}">${t.type} @ (${Math.round(t.x)},${Math.round(t.y)}) sec:${t.sector}</div>`;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectObject({ type: item.dataset.type, index: parseInt(item.dataset.index) });
            });
        });
    }
    
    render() {
        const ctx = this.ctx;
        const w = this.width, h = this.height;
        
        if (this.cameraNeedsCentering) {
            this.centerCameraOnContent();
            this.cameraNeedsCentering = false;
        }
        
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, w, h);
        
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);
        
        this.drawGrid(ctx);
        this.drawSectors(ctx);
        this.drawWalls(ctx);
        this.drawVertices(ctx);
        this.drawThings(ctx);
        
        if (this.drawingWall) {
            const pos = this.screenToWorld(this.width/2, this.height/2);
            ctx.strokeStyle = '#0F0';
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(this.drawingWall.x, this.drawingWall.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.creatingSector.length > 0) {
            ctx.strokeStyle = '#0FF';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.creatingSector[0].x, this.creatingSector[0].y);
            for (let i = 1; i < this.creatingSector.length; i++) {
                ctx.lineTo(this.creatingSector[i].x, this.creatingSector[i].y);
            }
            const pos = this.screenToWorld(this.width/2, this.height/2);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#0FF';
            for (const v of this.creatingSector) {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 4 / this.camera.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (this.creatingPortal) {
            const wall = this.seed.walls[this.creatingPortal.wall];
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            ctx.strokeStyle = '#FF0';
            ctx.lineWidth = 3 / this.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
        
        ctx.restore();
        
        this.drawUI(ctx);
    }
    
    drawGrid(ctx) {
        const gridSize = GRID_SIZE;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize - gridSize * 2;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize - gridSize * 2;
        const endX = startX + this.width / this.camera.zoom + gridSize * 4;
        const endY = startY + this.height / this.camera.zoom + gridSize * 4;
        
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = 1 / this.camera.zoom;
        
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#2A2A2A';
        for (let x = startX; x <= endX; x += gridSize * 4) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize * 4) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }
    
    drawSectors(ctx) {
        for (let i = 0; i < this.seed.sectors.length; i++) {
            const sector = this.seed.sectors[i];
            if (sector.vertices.length < 3) continue;
            
            const isSelected = this.selectedObject?.type === 'sector' && this.selectedObject.index === i;
            
            ctx.beginPath();
            for (let j = 0; j < sector.vertices.length; j++) {
                const v = this.seed.vertices[sector.vertices[j]];
                if (!v) continue;
                if (j === 0) ctx.moveTo(v.x, v.y);
                else ctx.lineTo(v.x, v.y);
            }
            ctx.closePath();
            
            const light = sector.lightLevel || 1;
            const r = Math.floor(20 * light);
            const g = Math.floor(30 * light);
            const b = Math.floor(20 * light);
            ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
            ctx.fill();
            
            if (isSelected) {
                ctx.strokeStyle = '#0F0';
                ctx.lineWidth = 2 / this.camera.zoom;
                ctx.stroke();
            }
            
            const cx = sector.vertices.reduce((sum, idx) => sum + this.seed.vertices[idx].x, 0) / sector.vertices.length;
            const cy = sector.vertices.reduce((sum, idx) => sum + this.seed.vertices[idx].y, 0) / sector.vertices.length;
            
            ctx.fillStyle = isSelected ? '#0F0' : '#888';
            ctx.font = `${12 / this.camera.zoom}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`S${i} F:${sector.floorHeight} C:${sector.ceilHeight}`, cx, cy);
        }
    }
    
drawWalls(ctx) {
        for (let i = 0; i < this.seed.walls.length; i++) {
            const wall = this.seed.walls[i];
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            if (!v1 || !v2) continue;
            
            const isPortal = wall.portal !== undefined;
            const isSelected = this.selectedObject?.type === 'wall' && this.selectedObject.index === i;
            const isHovered = this.hoveredObject?.type === 'wall' && this.hoveredObject.index === i;
            
            // Draw wall texture preview in 2D view
            const tex = this.assets[wall.texture];
            if (tex && this.camera.zoom > 0.3) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                const mx = (v1.x + v2.x) / 2;
                const my = (v1.y + v2.y) / 2;
                const dx = v2.x - v1.x;
                const dy = v2.y - v1.y;
                const len = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                ctx.translate(mx, my);
                ctx.rotate(angle);
                const texScale = Math.min(len / 128, 1) * this.camera.zoom;
                ctx.drawImage(tex, -64 * texScale, -32 * texScale, 128 * texScale, 64 * texScale);
                ctx.restore();
            }
            
            ctx.strokeStyle = isSelected ? '#0F0' : (isHovered ? '#FF0' : (isPortal ? '#0FF' : '#444'));
            ctx.lineWidth = (isSelected || isHovered ? 3 : 1) / this.camera.zoom;
            ctx.setLineDash(isPortal ? [10 / this.camera.zoom, 5 / this.camera.zoom] : []);
            
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            const mx = (v1.x + v2.x) / 2;
            const my = (v1.y + v2.y) / 2;
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len * 10;
            const ny = dx / len * 10;
            
            ctx.fillStyle = isPortal ? '#0FF' : '#888';
            ctx.font = `${10 / this.camera.zoom}px monospace`;
            ctx.textAlign = 'center';
            if (isPortal) {
                ctx.fillText(`→${wall.portal}`, mx + nx, my + ny);
            }
            
            // Show height difference for portal walls
            if (isPortal && wall.portal !== undefined) {
                const otherSector = this.seed.sectors[wall.portal];
                const thisSector = this.findSectorForWall(i);
                if (otherSector && thisSector) {
                    const floorDiff = otherSector.floorHeight - thisSector.floorHeight;
                    const ceilDiff = otherSector.ceilHeight - thisSector.ceilHeight;
                    if (floorDiff !== 0 || ceilDiff !== 0) {
                        ctx.fillStyle = '#FF0';
                        ctx.font = `${8 / this.camera.zoom}px monospace`;
                        ctx.fillText(`ΔF:${floorDiff} ΔC:${ceilDiff}`, mx - nx, my - ny);
                    }
                }
            }
        }
    }
    
    findSectorForWall(wallIndex) {
        for (const sector of this.seed.sectors) {
            if (sector.walls.includes(wallIndex)) return sector;
        }
        return null;
    }
    
    drawVertices(ctx) {
        for (let i = 0; i < this.seed.vertices.length; i++) {
            const v = this.seed.vertices[i];
            const isSelected = this.selectedObject?.type === 'vertex' && this.selectedObject.index === i;
            const isHovered = this.hoveredObject?.type === 'vertex' && this.hoveredObject.index === i;
            
            ctx.fillStyle = isSelected ? '#0F0' : (isHovered ? '#FF0' : '#888');
            ctx.beginPath();
            ctx.arc(v.x, v.y, (isSelected || isHovered ? 6 : 4) / this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFF';
            ctx.font = `${8 / this.camera.zoom}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(i.toString(), v.x, v.y - 10 / this.camera.zoom);
        }
    }
    
    drawThings(ctx) {
        const thingSprites = {
            'player': { color: '#0F0', shape: 'triangle', size: 8 },
            'enemy_grunt': { color: '#F80', shape: 'circle', size: 6 },
            'enemy_imp': { color: '#F40', shape: 'circle', size: 6 },
            'enemy_demon': { color: '#F00', shape: 'square', size: 8 },
            'pickup_health': { color: '#0F0', shape: 'cross', size: 5 },
            'pickup_armor': { color: '#0FF', shape: 'diamond', size: 5 },
            'pickup_ammo_pistol': { color: '#FF0', shape: 'square', size: 4 },
            'pickup_ammo_shells': { color: '#F80', shape: 'square', size: 4 },
            'weapon_shotgun': { color: '#0FF', shape: 'triangle', size: 6 },
            'weapon_chaingun': { color: '#0FF', shape: 'triangle', size: 6 },
            'light': { color: '#FF0', shape: 'star', size: 8 },
            'exit': { color: '#F0F', shape: 'circle', size: 10 }
        };
        
        for (let i = 0; i < this.seed.things.length; i++) {
            const thing = this.seed.things[i];
            const sprite = thingSprites[thing.type] || { color: '#FFF', shape: 'circle', size: 6 };
            const isSelected = this.selectedObject?.type === 'thing' && this.selectedObject.index === i;
            const isHovered = this.hoveredObject?.type === 'thing' && this.hoveredObject.index === i;
            
            ctx.fillStyle = isSelected ? '#0F0' : (isHovered ? '#FF0' : sprite.color);
            ctx.strokeStyle = isSelected ? '#0F0' : '#FFF';
            ctx.lineWidth = isSelected ? 2 / this.camera.zoom : 1 / this.camera.zoom;
            
            const size = sprite.size / this.camera.zoom;
            
            switch (sprite.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(thing.x, thing.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    if (isSelected) ctx.stroke();
                    break;
                case 'square':
                    ctx.fillRect(thing.x - size, thing.y - size, size * 2, size * 2);
                    if (isSelected) ctx.strokeRect(thing.x - size, thing.y - size, size * 2, size * 2);
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(thing.x, thing.y - size);
                    ctx.lineTo(thing.x - size, thing.y + size);
                    ctx.lineTo(thing.x + size, thing.y + size);
                    ctx.closePath();
                    ctx.fill();
                    if (isSelected) ctx.stroke();
                    break;
                case 'diamond':
                    ctx.beginPath();
                    ctx.moveTo(thing.x, thing.y - size);
                    ctx.lineTo(thing.x + size, thing.y);
                    ctx.lineTo(thing.x, thing.y + size);
                    ctx.lineTo(thing.x - size, thing.y);
                    ctx.closePath();
                    ctx.fill();
                    if (isSelected) ctx.stroke();
                    break;
                case 'cross':
                    ctx.fillRect(thing.x - size/2, thing.y - size, size, size * 2);
                    ctx.fillRect(thing.x - size, thing.y - size/2, size * 2, size);
                    break;
                case 'star':
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        const angle = j * Math.PI * 2 / 5 - Math.PI / 2;
                        const r = j % 2 === 0 ? size : size / 2;
                        ctx.lineTo(thing.x + Math.cos(angle) * r, thing.y + Math.sin(angle) * r);
                    }
                    ctx.closePath();
                    ctx.fill();
                    if (isSelected) ctx.stroke();
                    break;
            }
            
            if (thing.angle !== undefined) {
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 1 / this.camera.zoom;
                ctx.beginPath();
                ctx.moveTo(thing.x, thing.y);
                ctx.lineTo(thing.x + Math.cos(thing.angle) * size * 1.5, thing.y + Math.sin(thing.angle) * size * 1.5);
                ctx.stroke();
            }
        }
        
        if (this.seed.player) {
            const p = this.seed.player;
            ctx.fillStyle = '#0F0';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 10 / this.camera.zoom);
            ctx.lineTo(p.x - 8 / this.camera.zoom, p.y + 8 / this.camera.zoom);
            ctx.lineTo(p.x + 8 / this.camera.zoom, p.y + 8 / this.camera.zoom);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1 / this.camera.zoom;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + Math.cos(p.angle) * 20 / this.camera.zoom, p.y + Math.sin(p.angle) * 20 / this.camera.zoom);
            ctx.stroke();
        }
    }
    
    drawUI(ctx) {
        const toolName = TOOL_TYPES[this.tool]?.name || this.tool;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(10, 10, 250, 80);
        ctx.strokeStyle = '#0F0';
        ctx.strokeRect(10, 10, 250, 80);
        
        ctx.fillStyle = '#0F0';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Tool: ${toolName}`, 20, 30);
        ctx.fillText(`Zoom: ${(this.camera.zoom * 100).toFixed(0)}%`, 20, 50);
        ctx.fillText(`Vertices: ${this.seed.vertices.length} | Walls: ${this.seed.walls.length} | Sectors: ${this.seed.sectors.length} | Things: ${this.seed.things.length}`, 20, 70);
        
        if (this.creatingSector.length > 0) {
            ctx.fillStyle = '#0FF';
            ctx.fillText(`Creating sector: ${this.creatingSector.length} vertices (click first to close)`, 20, 90);
        }
        if (this.drawingWall) {
            ctx.fillStyle = '#0F0';
            ctx.fillText('Drawing wall: click to place end point', 20, 90);
        }
        if (this.creatingPortal) {
            ctx.fillStyle = '#FF0';
            ctx.fillText('Creating portal: click another wall to connect', 20, 90);
        }
    }
    
    showMessage(msg) {
        const log = document.getElementById('messageLog');
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = msg;
        log.appendChild(div);
        setTimeout(() => div.classList.add('fade'), 2500);
        setTimeout(() => div.remove(), 3000);
    }
    
    ensurePlayerStartAndTest() {
        const seed = this.getSeed();
        if (!seed.player || seed.player.sector === undefined || seed.sectors.length === 0) {
            if (seed.sectors.length > 0 && seed.sectors[0].vertices.length >= 3) {
                const v0 = seed.vertices[seed.sectors[0].vertices[0]];
                const v1 = seed.vertices[seed.sectors[0].vertices[1]];
                const v2 = seed.vertices[seed.sectors[0].vertices[2]];
                const cx = (v0.x + v1.x + v2.x) / 3;
                const cy = (v0.y + v1.y + v2.y) / 3;
                seed.player = { x: cx, y: cy, z: 0, angle: 0, sector: 0 };
                this.showMessage('Auto-placed player start in first sector');
            } else {
                seed.player = { x: 0, y: 0, z: 0, angle: 0, sector: 0 };
                this.showMessage('No sectors found - player at origin');
            }
        }
        this.onTest(seed);
    }
    
    getSeed() {
        return cloneSeed(this.seed);
    }
    
    async saveSeed() {
        try {
            const seedKey = await compressSeed(this.seed);
            navigator.clipboard.writeText(seedKey);
            this.showMessage('Seed key copied to clipboard!');
            
            const blob = new Blob([seedKey], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.seed.name.replace(/\s+/g, '_')}.seed`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            this.showMessage('Error saving seed: ' + e.message);
        }
    }
    
    loadSeedPrompt() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.seed,.txt';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                this.seed = await decompressSeed(text.trim());
                if (!validateSeed(this.seed)) throw new Error('Invalid seed');
                this.showMessage(`Loaded seed: ${this.seed.name}`);
                this.selectObject(null);
                this.updateUI();
            } catch (err) {
                this.showMessage('Error loading seed: ' + err.message);
            }
        };
        input.click();
    }
    
    exportHAD() {
        const gameName = prompt('Game name:', this.seed.name) || 'Untitled Game';
        const had = {
            'game-name': gameName,
            'menu-options': 'start game, options',
            scenes: [{
                scene: this.seed.name.toLowerCase().replace(/\s+/g, '_'),
                title: this.seed.name,
                'start-from': 'start game',
                'seed-key': null,
                'end-goto': 'ENDGAME'
            }],
            reload: 'on'
        };
        
        this.onExportHAD(had);
    }
    
    loadSeed(seed) {
        this.seed = cloneSeed(seed);
        this.selectObject(null);
        this.updateUI();
        this.showMessage(`Loaded seed: ${seed.name}`);
    }
    
    centerCameraOnContent() {
        if (this.seed.vertices.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of this.seed.vertices) {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        }
        
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;
        
        this.camera.x = cx;
        this.camera.y = cy;
        
        if (width > 0 && height > 0) {
            const zoomX = (this.width * 0.8) / width;
            const zoomY = (this.height * 0.8) / height;
            this.camera.zoom = Math.min(zoomX, zoomY, 2);
        }
    }
    
    start() {
        this.running = true;
        this.loop();
    }
    
    stop() {
        this.running = false;
    }
    
    loop() {
        if (!this.running) return;
        this.render();
        requestAnimationFrame(() => this.loop());
    }
}

export default MapEditor;