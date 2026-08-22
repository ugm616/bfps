export const DEFAULT_SVG_ASSETS = {
    'player_fist': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 50 L25 35 L30 35 L30 20 L34 20 L34 35 L39 35 Z" fill="#8B7355" stroke="#5D4E37" stroke-width="1"/>
        <path d="M28 38 L26 45" stroke="#5D4E37" stroke-width="2" fill="none"/>
        <path d="M32 38 L32 45" stroke="#5D4E37" stroke-width="2" fill="none"/>
        <path d="M36 38 L38 45" stroke="#5D4E37" stroke-width="2" fill="none"/>
    </svg>`,
    
    'weapon_pistol': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="30" width="28" height="70" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="54" y="15" width="20" height="20" fill="#1A1A1A" stroke="#0A0A0A" stroke-width="1"/>
        <rect x="52" y="85" width="24" height="15" fill="#3A3A3A" stroke="#2A2A2A" stroke-width="1"/>
        <circle cx="64" cy="55" r="3" fill="#FFD700"/>
        <path d="M54 40 L54 25 L74 25 L74 40" fill="none" stroke="#FFD700" stroke-width="2"/>
    </svg>`,
    
    'weapon_shotgun': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect x="45" y="25" width="38" height="80" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="48" y="15" width="32" height="15" fill="#1A1A1A"/>
        <rect x="50" y="90" width="28" height="12" fill="#3A3A3A"/>
        <ellipse cx="64" cy="55" rx="12" ry="8" fill="#1A1A1A" stroke="#0A0A0A" stroke-width="1"/>
        <path d="M52 35 Q64 20 76 35" fill="none" stroke="#FFD700" stroke-width="3"/>
    </svg>`,
    
    'weapon_chaingun': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="20" width="48" height="85" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="44" y="15" width="40" height="10" fill="#1A1A1A"/>
        <circle cx="64" cy="55" r="15" fill="#1A1A1A" stroke="#0A0A0A" stroke-width="2"/>
        <circle cx="64" cy="55" r="10" fill="#333" stroke="#222" stroke-width="1"/>
        <circle cx="64" cy="55" r="5" fill="#FFD700"/>
        <rect x="62" y="55" width="4" height="25" fill="#FFD700"/>
    </svg>`,
    
    'enemy_grunt': `<svg viewBox="0 0 64 128" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="110" rx="28" ry="18" fill="#4A3A2A" stroke="#2A1A0A" stroke-width="2"/>
        <ellipse cx="32" cy="85" rx="22" ry="25" fill="#5A4A3A" stroke="#3A2A1A" stroke-width="2"/>
        <circle cx="32" cy="55" r="18" fill="#6A5A4A" stroke="#4A3A2A" stroke-width="2"/>
        <ellipse cx="22" cy="50" rx="5" ry="6" fill="#FFD700"/>
        <ellipse cx="42" cy="50" rx="5" ry="6" fill="#FFD700"/>
        <path d="M20 65 Q32 55 44 65" fill="none" stroke="#2A1A0A" stroke-width="2"/>
        <rect x="10" y="115" width="18" height="10" fill="#3A2A1A"/>
        <rect x="36" y="115" width="18" height="10" fill="#3A2A1A"/>
    </svg>`,
    
    'enemy_imp': `<svg viewBox="0 0 64 128" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="110" rx="26" ry="16" fill="#8B0000" stroke="#5B0000" stroke-width="2"/>
        <ellipse cx="32" cy="85" rx="20" ry="22" fill="#A00" stroke="#700" stroke-width="2"/>
        <circle cx="32" cy="52" r="16" fill="#B00" stroke="#800" stroke-width="2"/>
        <ellipse cx="22" cy="48" rx="5" ry="6" fill="#FFD700"/>
        <ellipse cx="42" cy="48" rx="5" ry="6" fill="#FFD700"/>
        <path d="M18 62 Q32 50 46 62" fill="none" stroke="#500" stroke-width="3"/>
        <path d="M22 40 L15 30" stroke="#FFD700" stroke-width="3" fill="none"/>
        <path d="M42 40 L49 30" stroke="#FFD700" stroke-width="3" fill="none"/>
        <ellipse cx="32" cy="112" rx="20" ry="8" fill="#600"/>
    </svg>`,
    
    'enemy_demon': `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="48" cy="70" rx="40" ry="25" fill="#8B0000" stroke="#5B0000" stroke-width="3"/>
        <ellipse cx="48" cy="50" rx="30" ry="25" fill="#A00" stroke="#700" stroke-width="2"/>
        <circle cx="30" cy="40" r="8" fill="#FFD700"/>
        <circle cx="66" cy="40" r="8" fill="#FFD700"/>
        <path d="M25 60 Q48 45 71 60" fill="none" stroke="#500" stroke-width="4"/>
        <polygon points="35,55 40,50 45,55 48,50 51,55 56,50" fill="#FFF"/>
        <ellipse cx="48" cy="80" rx="35" ry="10" fill="#600"/>
    </svg>`,
    
    'pickup_health': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#2A2A2A" stroke="#0F0" stroke-width="2"/>
        <rect x="13" y="6" width="6" height="20" fill="#0F0"/>
        <rect x="6" y="13" width="20" height="6" fill="#0F0"/>
        <circle cx="16" cy="16" r="4" fill="#2A2A2A"/>
    </svg>`,
    
    'pickup_armor': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#2A2A2A" stroke="#0FF" stroke-width="2"/>
        <path d="M16 6 L26 16 L16 26 L6 16 Z" fill="none" stroke="#0FF" stroke-width="3"/>
        <path d="M16 10 L22 16 L16 22 L10 16 Z" fill="#0FF" opacity="0.3"/>
    </svg>`,
    
    'pickup_ammo_pistol': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#2A2A2A" stroke="#FFD700" stroke-width="2"/>
        <rect x="10" y="10" width="12" height="12" fill="#3A3A3A" stroke="#FFD700" stroke-width="1"/>
        <rect x="12" y="12" width="8" height="8" fill="#FFD700"/>
        <text x="16" y="20" text-anchor="middle" fill="#000" font-size="8" font-weight="bold">9</text>
    </svg>`,
    
    'pickup_ammo_shells': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#2A2A2A" stroke="#FF8C00" stroke-width="2"/>
        <ellipse cx="16" cy="16" rx="10" ry="8" fill="#3A2A1A" stroke="#FF8C00" stroke-width="1"/>
        <ellipse cx="16" cy="14" rx="6" ry="4" fill="#FF8C00"/>
    </svg>`,
    
    'pickup_weapon_shotgun': `<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="4" width="48" height="24" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="2"/>
        <rect x="12" y="2" width="40" height="6" fill="#1A1A1A"/>
        <ellipse cx="32" cy="16" rx="14" ry="10" fill="#1A1A1A" stroke="#0A0A0A" stroke-width="1"/>
    </svg>`,
    
    'pickup_weapon_chaingun': `<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="52" height="24" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="2"/>
        <circle cx="32" cy="16" r="12" fill="#1A1A1A" stroke="#0A0A0A" stroke-width="2"/>
        <circle cx="32" cy="16" r="7" fill="#333" stroke="#222" stroke-width="1"/>
        <circle cx="32" cy="16" r="3" fill="#FFD700"/>
    </svg>`,
    
    'projectile_bullet': `<svg viewBox="0 0 8 16" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="0" width="4" height="16" fill="#FFD700"/>
        <rect x="1" y="2" width="6" height="12" fill="#FFA500" opacity="0.5"/>
    </svg>`,
    
    'projectile_plasma': `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="#00FFFF"/>
        <circle cx="8" cy="8" r="4" fill="#FFFFFF"/>
    </svg>`,
    
    'explosion': `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#FF4500" opacity="0.8"/>
        <circle cx="32" cy="32" r="20" fill="#FFD700" opacity="0.6"/>
        <circle cx="32" cy="32" r="12" fill="#FFF" opacity="0.4"/>
    </svg>`,
    
    'wall_tech': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#1A1A2A"/>
        <rect x="0" y="0" width="128" height="4" fill="#00FFFF" opacity="0.5"/>
        <rect x="0" y="124" width="128" height="4" fill="#00FFFF" opacity="0.5"/>
        <rect x="0" y="0" width="4" height="128" fill="#00FFFF" opacity="0.5"/>
        <rect x="124" y="0" width="4" height="128" fill="#00FFFF" opacity="0.5"/>
        <rect x="32" y="32" width="64" height="64" fill="#0A0A1A" stroke="#00FFFF" stroke-width="1" opacity="0.3"/>
        <circle cx="64" cy="64" r="20" fill="none" stroke="#00FFFF" stroke-width="1" opacity="0.3"/>
    </svg>`,
    
    'wall_brick': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#3A2A1A"/>
        <g stroke="#2A1A0A" stroke-width="1">
            <line x1="0" y1="16" x2="128" y2="16"/>
            <line x1="0" y1="32" x2="128" y2="32"/>
            <line x1="0" y1="48" x2="128" y2="48"/>
            <line x1="0" y1="64" x2="128" y2="64"/>
            <line x1="0" y1="80" x2="128" y2="80"/>
            <line x1="0" y1="96" x2="128" y2="96"/>
            <line x1="0" y1="112" x2="128" y2="112"/>
            <line x1="16" y1="0" x2="16" y2="128"/>
            <line x1="48" y1="16" x2="48" y2="128"/>
            <line x1="80" y1="16" x2="80" y2="128"/>
            <line x1="112" y1="16" x2="112" y2="128"/>
            <line x1="32" y1="0" x2="32" y2="16"/>
            <line x1="64" y1="0" x2="64" y2="16"/>
            <line x1="96" y1="0" x2="96" y2="16"/>
            <line x1="32" y1="32" x2="32" y2="48"/>
            <line x1="64" y1="32" x2="64" y2="48"/>
            <line x1="96" y1="32" x2="96" y2="48"/>
            <line x1="16" y1="64" x2="16" y2="80"/>
            <line x1="48" y1="64" x2="48" y2="80"/>
            <line x1="80" y1="64" x2="80" y2="80"/>
            <line x1="112" y1="64" x2="112" y2="80"/>
            <line x1="32" y1="96" x2="32" y2="112"/>
            <line x1="64" y1="96" x2="64" y2="112"/>
            <line x1="96" y1="96" x2="96" y2="112"/>
        </g>
    </svg>`,
    
    'wall_metal': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#2A2A2A"/>
        <rect x="0" y="0" width="128" height="128" fill="url(#metalGrad)"/>
        <defs>
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4A4A4A" stop-opacity="0.3"/>
                <stop offset="50%" stop-color="#1A1A1A" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#3A3A3A" stop-opacity="0.3"/>
            </linearGradient>
        </defs>
        <g stroke="#4A4A4A" stroke-width="2">
            <rect x="8" y="8" width="112" height="112" fill="none"/>
            <rect x="24" y="24" width="80" height="80" fill="none"/>
        </g>
        <circle cx="64" cy="64" r="4" fill="#0F0" opacity="0.5"/>
        <circle cx="32" cy="32" r="3" fill="#0F0" opacity="0.3"/>
        <circle cx="96" cy="32" r="3" fill="#0F0" opacity="0.3"/>
        <circle cx="32" cy="96" r="3" fill="#0F0" opacity="0.3"/>
        <circle cx="96" cy="96" r="3" fill="#0F0" opacity="0.3"/>
    </svg>`,
    
    'floor_concrete': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#2A2A2A"/>
        <g fill="#3A3A3A" opacity="0.5">
            <circle cx="16" cy="16" r="8"/>
            <circle cx="48" cy="48" r="12"/>
            <circle cx="80" cy="32" r="6"/>
            <circle cx="112" cy="96" r="10"/>
            <circle cx="32" cy="112" r="7"/>
            <circle cx="96" cy="64" r="9"/>
        </g>
    </svg>`,
    
    'floor_lava': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#3A0A0A"/>
        <defs>
            <radialGradient id="lava1" cx="20%" cy="20%" r="30%">
                <stop offset="0%" stop-color="#FF4500"/>
                <stop offset="100%" stop-color="#8B0000"/>
            </radialGradient>
            <radialGradient id="lava2" cx="70%" cy="60%" r="25%">
                <stop offset="0%" stop-color="#FFA500"/>
                <stop offset="100%" stop-color="#FF0000"/>
            </radialGradient>
            <radialGradient id="lava3" cx="40%" cy="80%" r="20%">
                <stop offset="0%" stop-color="#FFFF00"/>
                <stop offset="100%" stop-color="#FF8C00"/>
            </radialGradient>
        </defs>
        <circle cx="25" cy="25" r="30" fill="url(#lava1)" opacity="0.6"/>
        <circle cx="90" cy="75" r="25" fill="url(#lava2)" opacity="0.6"/>
        <circle cx="50" cy="100" r="20" fill="url(#lava3)" opacity="0.5"/>
        <path d="M0,128 Q64,64 128,128" fill="none" stroke="#FF4500" stroke-width="2" opacity="0.4"/>
    </svg>`,
    
    'ceiling_tiles': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" fill="#1A1A1A"/>
        <g stroke="#2A2A2A" stroke-width="1">
            <line x1="0" y1="32" x2="128" y2="32"/>
            <line x1="0" y1="64" x2="128" y2="64"/>
            <line x1="0" y1="96" x2="128" y2="96"/>
            <line x1="32" y1="0" x2="32" y2="128"/>
            <line x1="64" y1="0" x2="64" y2="128"/>
            <line x1="96" y1="0" x2="96" y2="128"/>
        </g>
        <g fill="#0F0" opacity="0.3">
            <rect x="4" y="4" width="24" height="24"/>
            <rect x="36" y="36" width="24" height="24"/>
            <rect x="68" y="68" width="24" height="24"/>
            <rect x="100" y="100" width="24" height="24"/>
        </g>
    </svg>`,
    
    'sky_hell': `<svg viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#2A0A0A"/>
                <stop offset="50%" stop-color="#5A1A0A"/>
                <stop offset="100%" stop-color="#8B0000"/>
            </linearGradient>
        </defs>
        <rect width="512" height="256" fill="url(#skyGrad)"/>
        <g fill="#FF4500" opacity="0.4">
            <circle cx="100" cy="80" r="40"/>
            <circle cx="300" cy="150" r="60"/>
            <circle cx="400" cy="50" r="30"/>
        </g>
        <g fill="#FFD700" opacity="0.3">
            <ellipse cx="150" cy="100" rx="80" ry="30"/>
            <ellipse cx="350" cy="180" rx="100" ry="40"/>
        </g>
        <path d="M0,256 Q128,180 256,256 Q384,180 512,256" fill="#3A0A0A" opacity="0.8"/>
    </svg>`,
    
    'sky_base': `<svg viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="baseSky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0A0A2A"/>
                <stop offset="100%" stop-color="#1A1A3A"/>
            </linearGradient>
        </defs>
        <rect width="512" height="256" fill="url(#baseSky)"/>
        <g fill="#0F0" opacity="0.2">
            <rect x="50" y="100" width="200" height="4"/>
            <rect x="300" y="150" width="150" height="3"/>
            <circle cx="100" cy="50" r="20"/>
            <circle cx="400" cy="80" r="15"/>
        </g>
        <g fill="#00FFFF" opacity="0.15">
            <rect x="0" y="0" width="512" height="2"/>
            <rect x="0" y="254" width="512" height="2"/>
        </g>
    </svg>`
};

export function svgToImage(svgString, width, height) {
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

export function svgToDataURL(svgString) {
    return 'data:image/svg+xml;base64,' + btoa(svgString);
}

export async function preloadAssets(assetList = {}) {
    const assets = { ...DEFAULT_SVG_ASSETS, ...assetList };
    const loaded = {};
    
    for (const [key, svg] of Object.entries(assets)) {
        const isWeapon = key.startsWith('weapon_') || key.startsWith('pickup_weapon');
        const w = isWeapon ? 128 : (key.startsWith('enemy_') ? 64 : 32);
        const h = isWeapon ? 128 : (key.startsWith('enemy_') ? 128 : 32);
        loaded[key] = await svgToImage(svg, w, h);
    }
    
    return loaded;
}