const PLAYER_HEIGHT = 41;
const PLAYER_RADIUS = 12;
const GRAVITY = 0.5;
const JUMP_FORCE = 12;
const MOVE_SPEED = 3.5;
const RUN_MULTIPLIER = 1.8;
const TURN_SPEED = 0.002;
const MOUSE_SENSITIVITY = 0.002;
const FOV = Math.PI / 3;
const MAX_DEPTH = 2000;
const RENDER_SCALE = 1;

class RaycastEngine {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assets = assets;
        this.width = 0;
        this.height = 0;
        this.halfWidth = 0;
        this.halfHeight = 0;
        
        this.seed = null;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.pickups = [];
        
        this.weapons = [
            { id: 'fist', name: 'FIST', damage: 20, range: 64, fireRate: 500, ammo: -1, maxAmmo: -1, reloadTime: 0, sprite: 'player_fist', projectile: null, spread: 0, auto: false },
            { id: 'pistol', name: 'PISTOL', damage: 25, range: 2000, fireRate: 250, ammo: 50, maxAmmo: 200, reloadTime: 1000, sprite: 'weapon_pistol', projectile: 'projectile_bullet', spread: 0.01, auto: false },
            { id: 'shotgun', name: 'SHOTGUN', damage: 15, range: 800, fireRate: 900, ammo: 20, maxAmmo: 50, reloadTime: 1500, sprite: 'weapon_shotgun', projectile: 'projectile_bullet', spread: 0.08, pellets: 7, auto: false },
            { id: 'chaingun', name: 'CHAINGUN', damage: 18, range: 1500, fireRate: 80, ammo: 100, maxAmmo: 400, reloadTime: 2000, sprite: 'weapon_chaingun', projectile: 'projectile_bullet', spread: 0.03, auto: true }
        ];
        this.currentWeapon = 0;
        this.weaponBob = 0;
        this.weaponAnim = 0;
        this.reloading = false;
        this.lastFire = 0;
        
        this.keys = {};
        this.mouseLocked = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastTime = 0;
        this.running = false;
        
        this.messageLog = [];
        this.messageTimeout = 0;
        
        this.minimapScale = 0.15;
        this.showMinimap = false;
        
        this.bindEvents();
    }
    
    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                const idx = parseInt(e.code.slice(-1)) - 1;
                if (idx < this.weapons.length && this.hasWeapon(idx)) this.switchWeapon(idx);
            }
            if (e.code === 'KeyR') this.reload();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.mouseLocked) {
                this.canvas.requestPointerLock();
                return;
            }
            if (e.button === 0) this.keys['mouse0'] = true;
            if (e.button === 2) this.keys['mouse2'] = true;
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.keys['mouse0'] = false;
            if (e.button === 2) this.keys['mouse2'] = false;
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;
            let newWeapon = this.currentWeapon + delta;
            if (newWeapon < 0) newWeapon = this.weapons.length - 1;
            if (newWeapon >= this.weapons.length) newWeapon = 0;
            while (!this.hasWeapon(newWeapon) && newWeapon !== this.currentWeapon) {
                newWeapon += delta;
                if (newWeapon < 0) newWeapon = this.weapons.length - 1;
                if (newWeapon >= this.weapons.length) newWeapon = 0;
            }
            if (this.hasWeapon(newWeapon)) this.switchWeapon(newWeapon);
        }, { passive: false });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouseLocked = document.pointerLockElement === this.canvas;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.mouseLocked) {
                this.mouseX += e.movementX;
                this.mouseY += e.movementY;
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    hasWeapon(idx) {
        const w = this.weapons[idx];
        return w.ammo > 0 || w.ammo === -1;
    }
    
    switchWeapon(idx) {
        if (this.currentWeapon !== idx && this.hasWeapon(idx)) {
            this.currentWeapon = idx;
            this.weaponAnim = 20;
            this.reloading = false;
            this.showMessage(`SELECTED: ${this.weapons[idx].name}`);
        }
    }
    
    reload() {
        const w = this.weapons[this.currentWeapon];
        if (w.reloadTime > 0 && w.ammo < w.maxAmmo && w.ammo !== -1 && !this.reloading) {
            this.reloading = true;
            this.weaponAnim = w.reloadTime / 16;
            setTimeout(() => {
                const needed = w.maxAmmo - w.ammo;
                const available = this.getAmmoReserve(w.id);
                const toLoad = Math.min(needed, available);
                w.ammo += toLoad;
                this.consumeAmmoReserve(w.id, toLoad);
                this.reloading = false;
                this.showMessage(`RELOADED ${w.name}`);
            }, w.reloadTime);
        }
    }
    
    getAmmoReserve(weaponId) {
        const reserves = { pistol: 0, shotgun: 0, chaingun: 0 };
        return reserves[weaponId] || 0;
    }
    
    consumeAmmoReserve(weaponId, amount) {
    }
    
    giveAmmo(type, amount) {
        const w = this.weapons.find(w => w.id === type);
        if (w) {
            w.ammo = Math.min(w.maxAmmo, w.ammo + amount);
        }
    }
    
    giveWeapon(type) {
        const w = this.weapons.find(w => w.id === type);
        if (w && w.ammo === -1) {
            w.ammo = w.maxAmmo;
            this.showMessage(`GOT ${w.name.toUpperCase()}!`);
        }
    }
    
    addMessage(msg) {
        this.messageLog.push({ text: msg, time: Date.now() + 3000 });
        if (this.messageLog.length > 5) this.messageLog.shift();
    }
    
    showMessage(msg) {
        this.addMessage(msg);
    }
    
    async loadSeed(seed) {
        this.seed = seed;
        this.initPlayer();
        this.spawnEnemies();
        this.spawnPickups();
        this.resize();
    }
    
    initPlayer() {
        const p = this.seed.player;
        const sector = this.seed.sectors[p.sector] || this.seed.sectors[0];
        const floorH = sector ? sector.floorHeight : 0;
        this.player = {
            x: p.x, y: p.y, z: floorH + PLAYER_HEIGHT,
            angle: p.angle,
            velX: 0, velY: 0, velZ: 0,
            health: 100, maxHealth: 100,
            armor: 0,
            sector: p.sector,
            onGround: true,
            pitch: 0
        };
    }
    
    spawnEnemies() {
        this.enemies = [];
        for (const thing of this.seed.things) {
            if (thing.type.startsWith('enemy_')) {
                const sector = this.seed.sectors[thing.sector] || this.seed.sectors[0];
                const floorH = sector ? sector.floorHeight : 0;
                const enemyData = this.getEnemyData(thing.type);
                this.enemies.push({
                    ...enemyData,
                    x: thing.x, y: thing.y, z: floorH,
                    angle: thing.angle || 0,
                    sector: thing.sector,
                    state: 'idle',
                    target: null,
                    lastAttack: 0,
                    animFrame: 0,
                    alerted: false
                });
            }
        }
    }
    
    getEnemyData(type) {
        const data = {
            enemy_grunt: { type, health: 50, maxHealth: 50, speed: 2.5, damage: 8, attackRange: 80, attackRate: 1000, sprite: 'enemy_grunt', projectile: null, score: 50 },
            enemy_imp: { type, health: 80, maxHealth: 80, speed: 2, damage: 12, attackRange: 1200, attackRate: 1500, sprite: 'enemy_imp', projectile: 'projectile_plasma', score: 100 },
            enemy_demon: { type, health: 200, maxHealth: 200, speed: 4, damage: 25, attackRange: 60, attackRate: 800, sprite: 'enemy_demon', projectile: null, score: 200 }
        };
        return data[type] || data.enemy_grunt;
    }
    
    spawnPickups() {
        this.pickups = [];
        for (const thing of this.seed.things) {
            if (thing.type.startsWith('pickup_') || thing.type.startsWith('weapon_')) {
                const sector = this.seed.sectors[thing.sector] || this.seed.sectors[0];
                const floorH = sector ? sector.floorHeight : 0;
                this.pickups.push({
                    ...thing,
                    z: floorH + 16,
                    bobOffset: Math.random() * Math.PI * 2,
                    collected: false
                });
            }
        }
    }
    
    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.halfWidth = this.width / 2;
        this.halfHeight = this.height / 2;
        this.columnWidth = Math.max(1, Math.floor(this.width / 320));
        this.numRays = Math.ceil(this.width / this.columnWidth);
    }
    
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }
    
    stop() {
        this.running = false;
    }
    
    loop(time) {
        if (!this.running) return;
        const dt = Math.min(0.1, (time - this.lastTime) / 1000);
        this.lastTime = time;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame((t) => this.loop(t));
    }
    
    update(dt) {
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateProjectiles(dt);
        this.updateParticles(dt);
        this.updatePickups(dt);
        this.updateWeapon(dt);
        this.checkTriggers();
    }
    
    updatePlayer(dt) {
        const p = this.player;
        const speed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? MOVE_SPEED * RUN_MULTIPLIER : MOVE_SPEED;
        
        let forward = 0, strafe = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) forward = 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) forward = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe = -1;
        
        if (this.mouseLocked) {
            p.angle += this.mouseX * MOUSE_SENSITIVITY;
            p.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, p.pitch - this.mouseY * MOUSE_SENSITIVITY));
            this.mouseX = 0;
            this.mouseY = 0;
        } else {
            if (this.keys['ArrowLeft']) p.angle -= TURN_SPEED * 60 * dt;
            if (this.keys['ArrowRight']) p.angle += TURN_SPEED * 60 * dt;
        }
        
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        
        const moveX = (forward * cosA - strafe * sinA) * speed * 60 * dt;
        const moveY = (forward * sinA + strafe * cosA) * speed * 60 * dt;
        
        this.tryMove(moveX, moveY);
        
        if ((this.keys['Space'] || this.keys['mouse2']) && p.onGround) {
            p.velZ = JUMP_FORCE;
            p.onGround = false;
        }
        
        p.velZ -= GRAVITY * 60 * dt;
        p.z += p.velZ * 60 * dt;
        
        const sector = this.seed.sectors[p.sector];
        const floorH = sector ? sector.floorHeight : 0;
        const ceilH = sector ? sector.ceilHeight : 1000;
        
        if (p.z <= floorH + PLAYER_HEIGHT) {
            p.z = floorH + PLAYER_HEIGHT;
            p.velZ = 0;
            p.onGround = true;
        }
        if (p.z + PLAYER_HEIGHT >= ceilH) {
            p.z = ceilH - PLAYER_HEIGHT;
            p.velZ = 0;
        }
        
        p.sector = this.findSector(p.x, p.y, p.sector);
        
        if (this.keys['mouse0'] && !this.reloading) {
            this.fireWeapon();
        }
    }
    
    tryMove(dx, dy) {
        const p = this.player;
        let newX = p.x + dx;
        let newY = p.y + dy;
        
        const sector = this.seed.sectors[p.sector];
        if (!sector) return;
        
        for (const wallIdx of sector.walls) {
            const wall = this.seed.walls[wallIdx];
            if (!wall || wall.portal !== undefined) continue;
            
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            if (!v1 || !v2) continue;
            
            const dist = this.pointLineDist(newX, newY, v1.x, v1.y, v2.x, v2.y);
            if (dist < PLAYER_RADIUS) {
                const wallAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
                const pushAngle = wallAngle + Math.PI / 2;
                const pushX = Math.cos(pushAngle) * (PLAYER_RADIUS - dist);
                const pushY = Math.sin(pushAngle) * (PLAYER_RADIUS - dist);
                
                newX += pushX;
                newY += pushY;
            }
        }
        
        p.x = newX;
        p.y = newY;
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
    
    findSector(x, y, hintSector) {
        if (hintSector !== undefined) {
            const sector = this.seed.sectors[hintSector];
            if (sector && this.pointInSector(x, y, sector)) return hintSector;
        }
        
        for (let i = 0; i < this.seed.sectors.length; i++) {
            if (this.pointInSector(x, y, this.seed.sectors[i])) return i;
        }
        return 0;
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
    
    fireWeapon() {
        const w = this.weapons[this.currentWeapon];
        const now = performance.now();
        if (now - this.lastFire < w.fireRate) return;
        if (w.ammo === 0) {
            this.showMessage('OUT OF AMMO!');
            this.autoSwitchWeapon();
            return;
        }
        
        this.lastFire = now;
        this.weaponAnim = 5;
        
        if (w.ammo > 0) w.ammo--;
        
        const pellets = w.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * w.spread * 2;
            const pitchSpread = (Math.random() - 0.5) * w.spread;
            this.spawnProjectile(w, spread, pitchSpread);
        }
        
        this.addParticles(this.player.x, this.player.y, this.player.z, '#FFD700', 5);
        this.screenShake = 3;
    }
    
    spawnProjectile(weapon, spread, pitchSpread) {
        const p = this.player;
        const angle = p.angle + spread;
        const pitch = p.pitch + pitchSpread;
        const speed = 40;
        
        this.projectiles.push({
            x: p.x, y: p.y, z: p.z,
            vx: Math.cos(angle) * Math.cos(pitch) * speed,
            vy: Math.sin(angle) * Math.cos(pitch) * speed,
            vz: Math.sin(pitch) * speed,
            damage: weapon.damage,
            owner: 'player',
            life: 2,
            sprite: weapon.projectile
        });
    }
    
    autoSwitchWeapon() {
        for (let i = this.weapons.length - 1; i >= 0; i--) {
            if (this.hasWeapon(i)) {
                this.switchWeapon(i);
                break;
            }
        }
    }
    
    updateEnemies(dt) {
        const p = this.player;
        
        for (const enemy of this.enemies) {
            if (enemy.health <= 0) continue;
            
            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            const canSee = this.checkLOS(enemy.x, enemy.y, enemy.sector, p.x, p.y, p.sector);
            
            if (canSee && dist < 1000) enemy.alerted = true;
            
            if (enemy.alerted || canSee) {
                enemy.target = p;
                
                if (dist > enemy.attackRange + 50) {
                    const angle = Math.atan2(dy, dx);
                    enemy.angle = angle;
                    const nx = enemy.x + Math.cos(angle) * enemy.speed * 60 * dt;
                    const ny = enemy.y + Math.sin(angle) * enemy.speed * 60 * dt;
                    if (this.canMoveTo(enemy, nx, ny)) {
                        enemy.x = nx;
                        enemy.y = ny;
                    }
                } else if (dist <= enemy.attackRange) {
                    enemy.angle = Math.atan2(dy, dx);
                    const now = performance.now();
                    if (now - enemy.lastAttack > enemy.attackRate) {
                        enemy.lastAttack = now;
                        this.enemyAttack(enemy);
                    }
                }
            }
            
            enemy.animFrame += dt * 10;
        }
        
        this.enemies = this.enemies.filter(e => e.health > 0);
    }
    
    canMoveTo(enemy, nx, ny) {
        const sector = this.seed.sectors[enemy.sector];
        if (!sector) return true;
        
        for (const wallIdx of sector.walls) {
            const wall = this.seed.walls[wallIdx];
            if (!wall || wall.portal !== undefined) continue;
            
            const v1 = this.seed.vertices[wall.v1];
            const v2 = this.seed.vertices[wall.v2];
            if (!v1 || !v2) continue;
            
            const dist = this.pointLineDist(nx, ny, v1.x, v1.y, v2.x, v2.y);
            if (dist < 16) return false;
        }
        return true;
    }
    
    checkLOS(x1, y1, sector1, x2, y2, sector2) {
        if (sector1 === sector2) return true;
        
        const visited = new Set();
        const queue = [{ sector: sector1, x: x1, y: y1 }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.sector === sector2) return true;
            if (visited.has(current.sector)) continue;
            visited.add(current.sector);
            
            const sector = this.seed.sectors[current.sector];
            if (!sector) continue;
            
            for (const wallIdx of sector.walls) {
                const wall = this.seed.walls[wallIdx];
                if (wall.portal !== undefined) {
                    const v1 = this.seed.vertices[wall.v1];
                    const v2 = this.seed.vertices[wall.v2];
                    if (!v1 || !v2) continue;
                    
                    const wallAngle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
                    const toPlayer = Math.atan2(y2 - current.x, x2 - current.x);
                    const diff = Math.abs(wallAngle - toPlayer);
                    if (diff < Math.PI / 2) {
                        queue.push({ sector: wall.portal, x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
                    }
                }
            }
        }
        return false;
    }
    
    enemyAttack(enemy) {
        const p = this.player;
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (enemy.projectile) {
            const angle = Math.atan2(dy, dx);
            const pitch = Math.atan2(p.z - enemy.z, dist);
            const speed = 20;
            
            this.projectiles.push({
                x: enemy.x, y: enemy.y, z: enemy.z + 32,
                vx: Math.cos(angle) * Math.cos(pitch) * speed,
                vy: Math.sin(angle) * Math.cos(pitch) * speed,
                vz: Math.sin(pitch) * speed,
                damage: enemy.damage,
                owner: 'enemy',
                life: 3,
                sprite: enemy.projectile
            });
        } else if (dist <= enemy.attackRange + 20) {
            p.health -= enemy.damage;
            this.addParticles(p.x, p.y, p.z, '#FF0000', 8);
            this.screenShake = 5;
            this.showMessage(`HIT! Health: ${p.health}`);
            
            if (p.health <= 0) {
                this.playerDied();
            }
        }
    }
    
    playerDied() {
        this.showMessage('YOU DIED! Press R to restart');
        this.running = false;
        setTimeout(() => this.restartLevel(), 2000);
    }
    
    restartLevel() {
        this.loadSeed(this.seed);
        this.start();
    }
    
    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx * 60 * dt;
            proj.y += proj.vy * 60 * dt;
            proj.z += proj.vz * 60 * dt;
            proj.life -= dt;
            
            if (proj.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            if (proj.owner === 'player') {
                for (const enemy of this.enemies) {
                    if (enemy.health <= 0) continue;
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    const dz = enemy.z + 32 - proj.z;
                    const dist = Math.hypot(dx, dy, dz);
                    if (dist < 24) {
                        enemy.health -= proj.damage;
                        this.addParticles(enemy.x, enemy.y, enemy.z + 32, '#FF0000', 6);
                        if (enemy.health <= 0) {
                            this.showMessage(`KILLED ${enemy.type.replace('enemy_', '').toUpperCase()}! +${enemy.score} PTS`);
                        }
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            } else {
                const dx = this.player.x - proj.x;
                const dy = this.player.y - proj.y;
                const dz = this.player.z - proj.z;
                const dist = Math.hypot(dx, dy, dz);
                if (dist < 20) {
                    this.player.health -= proj.damage;
                    this.addParticles(this.player.x, this.player.y, this.player.z, '#FF0000', 8);
                    this.screenShake = 5;
                    this.projectiles.splice(i, 1);
                    if (this.player.health <= 0) this.playerDied();
                }
            }
            
            const sector = this.seed.sectors[this.findSector(proj.x, proj.y)];
            if (sector) {
                for (const wallIdx of sector.walls) {
                    const wall = this.seed.walls[wallIdx];
                    if (!wall || wall.portal !== undefined) continue;
                    const v1 = this.seed.vertices[wall.v1];
                    const v2 = this.seed.vertices[wall.v2];
                    if (!v1 || !v2) continue;
                    
                    const dist = this.pointLineDist(proj.x, proj.y, v1.x, v1.y, v2.x, v2.y);
                    if (dist < 8) {
                        this.addParticles(proj.x, proj.y, proj.z, '#FFFF00', 4);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
    
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * 60 * dt;
            p.y += p.vy * 60 * dt;
            p.z += p.vz * 60 * dt;
            p.vz -= GRAVITY * 60 * dt;
            p.life -= dt;
            p.alpha = p.life / p.maxLife;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    addParticles(x, y, z, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y, z,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: 2 + Math.random() * 8,
                color,
                size: 2 + Math.random() * 4,
                life: 0.3 + Math.random() * 0.5,
                maxLife: 0.3 + Math.random() * 0.5,
                alpha: 1
            });
        }
    }
    
    updatePickups(dt) {
        const p = this.player;
        for (const pickup of this.pickups) {
            if (pickup.collected) continue;
            
            pickup.bobOffset += dt * 3;
            pickup.z += Math.sin(pickup.bobOffset) * 0.5 * 60 * dt;
            
            const dx = p.x - pickup.x;
            const dy = p.y - pickup.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 32 && Math.abs(p.z - pickup.z) < 40) {
                this.collectPickup(pickup);
            }
        }
        this.pickups = this.pickups.filter(p => !p.collected);
    }
    
    collectPickup(pickup) {
        pickup.collected = true;
        
        if (pickup.type === 'pickup_health') {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
            this.showMessage('HEALTH +25');
        } else if (pickup.type === 'pickup_armor') {
            this.player.armor = Math.min(200, this.player.armor + 50);
            this.showMessage('ARMOR +50');
        } else if (pickup.type === 'pickup_ammo_pistol') {
            const w = this.weapons.find(w => w.id === 'pistol');
            if (w) { w.ammo = Math.min(w.maxAmmo, w.ammo + 20); this.showMessage('PISTOL AMMO +20'); }
        } else if (pickup.type === 'pickup_ammo_shells') {
            const w = this.weapons.find(w => w.id === 'shotgun');
            if (w) { w.ammo = Math.min(w.maxAmmo, w.ammo + 8); this.showMessage('SHELLS +8'); }
        } else if (pickup.type.startsWith('weapon_')) {
            const weaponId = pickup.type.replace('weapon_', '');
            const w = this.weapons.find(w => w.id === weaponId);
            if (w && w.ammo === -1) {
                w.ammo = w.maxAmmo;
                this.showMessage(`GOT ${w.name.toUpperCase()}!`);
            } else if (w) {
                w.ammo = Math.min(w.maxAmmo, w.ammo + (weaponId === 'shotgun' ? 8 : 50));
                this.showMessage(`${w.name.toUpperCase()} AMMO!`);
            }
        }
        
        this.addParticles(pickup.x, pickup.y, pickup.z, '#00FF00', 10);
    }
    
    updateWeapon(dt) {
        const w = this.weapons[this.currentWeapon];
        this.weaponBob += dt * 10;
        if (this.weaponAnim > 0) this.weaponAnim -= dt * 60;
    }
    
    checkTriggers() {
        const p = this.player;
        const sector = this.seed.sectors[p.sector];
        if (sector && sector.exit) {
            this.levelComplete(sector.exit);
        }
        
        for (const thing of this.seed.things) {
            if (thing.type === 'exit' && !thing.triggered) {
                const dx = p.x - thing.x;
                const dy = p.y - thing.y;
                if (Math.hypot(dx, dy) < 40) {
                    thing.triggered = true;
                    this.levelComplete(thing.target);
                }
            }
        }
    }
    
    levelComplete(nextLevel) {
        this.showMessage(`LEVEL COMPLETE! Loading ${nextLevel}...`);
        this.running = false;
        setTimeout(() => {
            if (this.onLevelComplete) this.onLevelComplete(nextLevel);
        }, 1500);
    }
    
    render() {
        const ctx = this.ctx;
        const w = this.width, h = this.height;
        const hw = this.halfWidth, hh = this.halfHeight;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        this.renderWorld();
        this.renderSprites();
        this.renderWeapon();
        this.renderParticles();
        this.renderHUD();
        this.renderMessages();
        
        if (this.showMinimap) this.renderMinimap();
        
        if (this.screenShake > 0) {
            this.screenShake--;
            ctx.save();
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
            ctx.restore();
        }
    }
    
    renderWorld() {
        const p = this.player;
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        
        const visibleSectors = this.getVisibleSectors(p.sector);
        
        const columns = [];
        
        for (const sectorIdx of visibleSectors) {
            const sector = this.seed.sectors[sectorIdx];
            if (!sector) continue;
            
            for (const wallIdx of sector.walls) {
                const wall = this.seed.walls[wallIdx];
                if (!wall) continue;
                
                const v1 = this.seed.vertices[wall.v1];
                const v2 = this.seed.vertices[wall.v2];
                if (!v1 || !v2) continue;
                
                const x1 = v1.x - p.x;
                const y1 = v1.y - p.y;
                const x2 = v2.x - p.x;
                const y2 = v2.y - p.y;
                
                const rx1 = x1 * cosA + y1 * sinA;
                const ry1 = -x1 * sinA + y1 * cosA;
                const rx2 = x2 * cosA + y2 * sinA;
                const ry2 = -x2 * sinA + y2 * cosA;
                
                if (ry1 <= 1 && ry2 <= 1) continue;
                
                let cx1 = rx1, cy1 = ry1, cx2 = rx2, cy2 = ry2;
                
                if (ry1 < 1) {
                    const t = (1 - ry1) / (ry2 - ry1);
                    cx1 = rx1 + (rx2 - rx1) * t;
                    cy1 = 1;
                }
                if (ry2 < 1) {
                    const t = (1 - ry2) / (ry1 - ry2);
                    cx2 = rx2 + (rx1 - rx2) * t;
                    cy2 = 1;
                }
                
                const scale1 = this.halfHeight / cy1;
                const scale2 = this.halfHeight / cy2;
                
                const x1s = this.halfWidth + cx1 * scale1;
                const x2s = this.halfWidth + cx2 * scale2;
                
                const left = Math.floor(Math.min(x1s, x2s));
                const right = Math.ceil(Math.max(x1s, x2s));
                
                if (right < 0 || left >= this.width) continue;
                
                const floorH = sector.floorHeight;
                const ceilH = sector.ceilHeight;
                const light = sector.lightLevel || 1;
                const flicker = sector.flicker ? Math.sin(performance.now() * 0.01) * 0.2 + 0.8 : 1;
                const lightLevel = light * flicker;
                
                let neighborFloor = floorH, neighborCeil = ceilH;
                let isPortal = false;
                if (wall.portal !== undefined) {
                    const nSector = this.seed.sectors[wall.portal];
                    if (nSector) {
                        neighborFloor = nSector.floorHeight;
                        neighborCeil = nSector.ceilHeight;
                        isPortal = true;
                    }
                }
                
                for (let x = Math.max(0, left); x <= Math.min(this.width - 1, right); x++) {
                    const t = (x - left) / (right - left);
                    const ry = cy1 + (cy2 - cy1) * t;
                    const scale = this.halfHeight / ry;
                    const dist = ry;
                    
                    const topY = this.halfHeight - (ceilH - p.z) * scale - p.pitch * scale;
                    const bottomY = this.halfHeight - (floorH - p.z) * scale - p.pitch * scale;
                    
                    let nTopY = topY, nBottomY = bottomY;
                    if (isPortal) {
                        nTopY = this.halfHeight - (neighborCeil - p.z) * scale - p.pitch * scale;
                        nBottomY = this.halfHeight - (neighborFloor - p.z) * scale - p.pitch * scale;
                    }
                    
                    const col = columns[x] || (columns[x] = { top: [], bottom: [], portalTop: [], portalBottom: [], dist: dist, light: lightLevel, wall: wall });
                    col.dist = Math.min(col.dist, dist);
                    col.light = lightLevel;
                    col.top.push({ y: topY, x });
                    col.bottom.push({ y: bottomY, x });
                    if (isPortal) {
                        col.portalTop.push({ y: nTopY, x });
                        col.portalBottom.push({ y: nBottomY, x });
                    }
                }
            }
        }
        
        for (let x = 0; x < this.width; x++) {
            const col = columns[x];
            if (!col) continue;
            
            const light = Math.max(0.1, col.light || 1);
            const wall = col.wall;
            
            for (let i = 0; i < col.top.length - 1; i++) {
                const y1 = col.top[i].y;
                const y2 = col.top[i + 1].y;
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                
                ctx.fillStyle = this.shadeColor(wall.ceilColor || '#1A1A1A', light);
                ctx.fillRect(x, Math.max(0, minY), this.columnWidth, Math.max(1, maxY - minY));
            }
            
            for (let i = 0; i < col.bottom.length - 1; i++) {
                const y1 = col.bottom[i].y;
                const y2 = col.bottom[i + 1].y;
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);
                
                ctx.fillStyle = this.shadeColor(wall.floorColor || '#0A0A0A', light);
                ctx.fillRect(x, Math.max(0, minY), this.columnWidth, Math.max(1, maxY - minY));
            }
            
            if (col.portalTop.length > 0) {
                for (let i = 0; i < col.portalTop.length - 1; i++) {
                    const y1 = col.portalTop[i].y;
                    const y2 = col.portalTop[i + 1].y;
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);
                    ctx.fillStyle = this.shadeColor('#000', light);
                    ctx.fillRect(x, Math.max(0, minY), this.columnWidth, Math.max(1, maxY - minY));
                }
            }
            if (col.portalBottom.length > 0) {
                for (let i = 0; i < col.portalBottom.length - 1; i++) {
                    const y1 = col.portalBottom[i].y;
                    const y2 = col.portalBottom[i + 1].y;
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);
                    ctx.fillStyle = this.shadeColor('#000', light);
                    ctx.fillRect(x, Math.max(0, minY), this.columnWidth, Math.max(1, maxY - minY));
                }
            }
            
            const midY1 = col.top[0]?.y ?? 0;
            const midY2 = col.bottom[0]?.y ?? this.height;
            
            for (let i = 0; i < col.top.length - 1; i++) {
                const y1 = col.top[i].y;
                const y2 = col.bottom[i].y;
                const y3 = col.bottom[i + 1].y;
                const y4 = col.top[i + 1].y;
                
                const minY = Math.min(y1, y2, y3, y4);
                const maxY = Math.max(y1, y2, y3, y4);
                
                const tex = this.assets[wall.texture || 'wall_tech'];
                if (tex) {
                    ctx.drawImage(tex, 
                        (i / col.top.length) * tex.width, 0, 1, tex.height,
                        x, minY, this.columnWidth, maxY - minY);
                } else {
                    ctx.fillStyle = this.shadeColor(wall.color || '#3A3A3A', light * 0.8);
                    ctx.fillRect(x, minY, this.columnWidth, maxY - minY);
                }
            }
        }
    }
    
    getVisibleSectors(startSector, maxDepth = 5) {
        const visible = new Set();
        const queue = [{ sector: startSector, depth: 0 }];
        
        while (queue.length > 0) {
            const { sector: idx, depth } = queue.shift();
            if (visible.has(idx) || depth > maxDepth) continue;
            visible.add(idx);
            
            const sector = this.seed.sectors[idx];
            if (!sector) continue;
            
            for (const wallIdx of sector.walls) {
                const wall = this.seed.walls[wallIdx];
                if (wall && wall.portal !== undefined && !visible.has(wall.portal)) {
                    queue.push({ sector: wall.portal, depth: depth + 1 });
                }
            }
        }
        
        return Array.from(visible);
    }
    
    shadeColor(hex, light) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const nr = Math.round(r * light);
        const ng = Math.round(g * light);
        const nb = Math.round(b * light);
        return `rgb(${nr},${ng},${nb})`;
    }
    
    renderSprites() {
        const p = this.player;
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        const ctx = this.ctx;
        
        const sprites = [
            ...this.enemies.filter(e => e.health > 0).map(e => ({ ...e, type: 'enemy' })),
            ...this.pickups.filter(p => !p.collected).map(p => ({ ...p, type: 'pickup' })),
            ...this.projectiles.map(p => ({ ...p, type: 'projectile' }))
        ];
        
        sprites.sort((a, b) => {
            const da = Math.hypot(a.x - p.x, a.y - p.y);
            const db = Math.hypot(b.x - p.x, b.y - p.y);
            return db - da;
        });
        
        for (const spr of sprites) {
            const dx = spr.x - p.x;
            const dy = spr.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1 || dist > MAX_DEPTH) continue;
            
            const angle = Math.atan2(dy, dx) - p.angle;
            let normAngle = angle;
            while (normAngle > Math.PI) normAngle -= Math.PI * 2;
            while (normAngle < -Math.PI) normAngle += Math.PI * 2;
            
            if (Math.abs(normAngle) > FOV / 2 + 0.5) continue;
            
            const screenX = this.halfWidth + Math.tan(normAngle) * this.halfWidth / Math.tan(FOV / 2);
            const scale = this.halfHeight / dist * 64;
            
            const spriteImg = this.assets[spr.sprite];
            if (!spriteImg) continue;
            
            const sw = spriteImg.width;
            const sh = spriteImg.height;
            const dw = scale * (sw / sh);
            const dh = scale;
            
            const x = screenX - dw / 2;
            const y = this.halfHeight - dh / 2 - (spr.z - p.z) * (this.halfHeight / dist) - p.pitch * (this.halfHeight / dist);
            
            if (x + dw < 0 || x > this.width) continue;
            
            ctx.drawImage(spriteImg, x, y, dw, dh);
        }
    }
    
    renderWeapon() {
        const w = this.weapons[this.currentWeapon];
        const sprite = this.assets[w.sprite];
        if (!sprite) return;
        
        const bobX = Math.sin(this.weaponBob) * 5;
        const bobY = Math.abs(Math.sin(this.weaponBob * 2)) * 3;
        const animY = this.weaponAnim > 0 ? Math.sin(this.weaponAnim * 0.5) * 20 : 0;
        const reloadY = this.reloading ? Math.sin((1 - this.weaponAnim / (w.reloadTime / 16)) * Math.PI) * 50 : 0;
        
        const img = document.getElementById('weaponSprite');
        img.src = this.assets[w.sprite]?.toDataURL() || '';
        img.style.transform = `translateX(-50%) translate(${bobX}px, ${bobY + animY + reloadY}px)`;
    }
    
    renderParticles() {
        const p = this.player;
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        
        for (const part of this.particles) {
            const dx = part.x - p.x;
            const dy = part.y - p.y;
            const dz = part.z - p.z;
            
            const rx = dx * cosA + dy * sinA;
            const ry = -dx * sinA + dy * cosA;
            
            if (ry < 1) continue;
            
            const scale = this.halfHeight / ry;
            const x = this.halfWidth + rx * scale;
            const y = this.halfHeight - dz * scale - p.pitch * scale;
            const size = part.size * scale;
            
            this.ctx.globalAlpha = part.alpha;
            this.ctx.fillStyle = part.color;
            this.ctx.fillRect(x - size/2, y - size/2, size, size);
        }
        this.ctx.globalAlpha = 1;
    }
    
    renderHUD() {
        document.getElementById('healthVal').textContent = Math.max(0, this.player.health);
        const w = this.weapons[this.currentWeapon];
        document.getElementById('ammoVal').textContent = w.ammo === -1 ? '--' : w.ammo;
        document.getElementById('ammoMax').textContent = w.maxAmmo === -1 ? '--' : w.maxAmmo;
        document.getElementById('weaponName').textContent = w.name;
    }
    
    renderMessages() {
        const log = document.getElementById('messageLog');
        const now = Date.now();
        log.innerHTML = '';
        for (const msg of this.messageLog) {
            const div = document.createElement('div');
            div.className = 'message' + (msg.time < now ? ' fade' : '');
            div.textContent = msg.text;
            log.appendChild(div);
        }
    }
    
    renderMinimap() {
        const ctx = this.ctx;
        const size = 200;
        const x = this.width - size - 10;
        const y = 10;
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#0F0';
        ctx.strokeRect(x, y, size, size);
        
        const p = this.player;
        const scale = size / 1000;
        
        for (const sector of this.seed.sectors) {
            if (!sector.vertices.length) continue;
            ctx.beginPath();
            for (let i = 0; i < sector.vertices.length; i++) {
                const v = this.seed.vertices[sector.vertices[i]];
                if (!v) continue;
                const mx = x + (v.x - p.x) * scale + size / 2;
                const my = y + (v.y - p.y) * scale + size / 2;
                if (i === 0) ctx.moveTo(mx, my);
                else ctx.lineTo(mx, my);
            }
            ctx.closePath();
            ctx.strokeStyle = sector === this.seed.sectors[p.sector] ? '#0F0' : '#444';
            ctx.stroke();
        }
        
        ctx.fillStyle = '#0F0';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        for (const enemy of this.enemies) {
            if (enemy.health <= 0) continue;
            const mx = x + (enemy.x - p.x) * scale + size / 2;
            const my = y + (enemy.y - p.y) * scale + size / 2;
            ctx.fillStyle = '#F00';
            ctx.fillRect(mx - 2, my - 2, 4, 4);
        }
    }
}

export default RaycastEngine;