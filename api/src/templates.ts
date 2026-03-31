import type { Color, WeaponType } from './types.js';

/**
 * A character template defines specific colors for body regions,
 * producing recognizable character archetypes instead of random noise.
 */
export interface CharacterTemplate {
  name: string;
  description: string;
  /** Color for the outline/edge pixels */
  outline: Color;
  /** Default weapon for this archetype */
  weapon: WeaponType;
  /** Colors per body region — each region can have 1-3 colors for variety */
  regions: {
    hair: Color[];
    skin: Color[];
    tunic: Color[];
    arms: Color[];
    legs: Color[];
    feet: Color[];
    /** Optional accent (belt area between torso and legs) */
    accent: Color[];
  };
}

// ---- Color helpers ----

function c(r: number, g: number, b: number): Color {
  return { r, g, b, a: 255 };
}

function darker(color: Color, amount = 40): Color {
  return {
    r: Math.max(0, color.r - amount),
    g: Math.max(0, color.g - amount),
    b: Math.max(0, color.b - amount),
    a: 255,
  };
}

function lighter(color: Color, amount = 30): Color {
  return {
    r: Math.min(255, color.r + amount),
    g: Math.min(255, color.g + amount),
    b: Math.min(255, color.b + amount),
    a: 255,
  };
}

// ---- Templates ----

export const TEMPLATES: Record<string, CharacterTemplate> = {
  adventurer: {
    name: 'Adventurer',
    description: 'Green-clad hero with blonde hair, brown boots, and a belt',
    outline: c(30, 30, 20),
    weapon: 'sword',
    regions: {
      hair: [c(230, 200, 80), c(210, 180, 60), c(240, 215, 100)],
      skin: [c(240, 200, 160), c(230, 190, 150), c(245, 210, 170)],
      tunic: [c(40, 130, 50), c(55, 150, 65), c(35, 110, 40)],
      arms: [c(40, 130, 50), c(240, 200, 160)],
      legs: [c(220, 210, 190), c(210, 200, 180)],
      feet: [c(110, 70, 40), c(90, 55, 30)],
      accent: [c(140, 100, 40), c(160, 115, 50)],
    },
  },

  knight: {
    name: 'Knight',
    description: 'Silver-armored warrior with dark undersuit and blue accents',
    outline: c(20, 20, 30),
    weapon: 'sword',
    regions: {
      hair: [c(50, 50, 60), c(40, 40, 50)],
      skin: [c(230, 195, 165), c(220, 185, 155)],
      tunic: [c(170, 175, 185), c(190, 195, 205), c(150, 155, 165)],
      arms: [c(170, 175, 185), c(155, 160, 170)],
      legs: [c(140, 145, 155), c(160, 165, 175)],
      feet: [c(120, 125, 135), c(100, 105, 115)],
      accent: [c(60, 80, 160), c(50, 70, 140)],
    },
  },

  mage: {
    name: 'Mage',
    description: 'Purple-robed spellcaster with white hair and golden accents',
    outline: c(25, 10, 35),
    weapon: 'staff',
    regions: {
      hair: [c(230, 230, 245), c(215, 215, 235), c(245, 240, 255)],
      skin: [c(235, 210, 200), c(225, 200, 190)],
      tunic: [c(100, 40, 140), c(120, 55, 160), c(80, 30, 115)],
      arms: [c(100, 40, 140), c(110, 50, 150)],
      legs: [c(90, 35, 125), c(80, 30, 110)],
      feet: [c(60, 20, 80), c(50, 15, 70)],
      accent: [c(200, 170, 50), c(220, 190, 70)],
    },
  },

  rogue: {
    name: 'Rogue',
    description: 'Dark leather-clad thief with hood and daggers',
    outline: c(15, 15, 15),
    weapon: 'dagger',
    regions: {
      hair: [c(50, 40, 35), c(40, 30, 25)],
      skin: [c(220, 185, 155), c(210, 175, 145)],
      tunic: [c(60, 50, 40), c(75, 65, 50), c(50, 40, 30)],
      arms: [c(60, 50, 40), c(70, 60, 45)],
      legs: [c(55, 45, 35), c(65, 55, 45)],
      feet: [c(40, 35, 25), c(35, 30, 20)],
      accent: [c(140, 30, 30), c(120, 25, 25)],
    },
  },

  warrior: {
    name: 'Warrior',
    description: 'Red-armored fighter with plate and dark hair',
    outline: c(30, 15, 10),
    weapon: 'sword',
    regions: {
      hair: [c(40, 30, 25), c(30, 20, 15)],
      skin: [c(210, 170, 130), c(200, 160, 120)],
      tunic: [c(160, 40, 30), c(180, 55, 40), c(140, 30, 20)],
      arms: [c(160, 40, 30), c(145, 35, 25)],
      legs: [c(100, 85, 70), c(90, 75, 60)],
      feet: [c(70, 55, 40), c(60, 45, 30)],
      accent: [c(200, 170, 50), c(180, 150, 40)],
    },
  },

  ranger: {
    name: 'Ranger',
    description: 'Forest dweller in green and brown with a cloak',
    outline: c(20, 30, 15),
    weapon: 'bow',
    regions: {
      hair: [c(130, 80, 40), c(110, 65, 30)],
      skin: [c(225, 195, 160), c(215, 185, 150)],
      tunic: [c(60, 95, 45), c(75, 110, 55), c(50, 80, 35)],
      arms: [c(80, 65, 40), c(70, 55, 35)],
      legs: [c(80, 65, 40), c(90, 75, 50)],
      feet: [c(65, 50, 30), c(55, 40, 25)],
      accent: [c(50, 80, 35), c(65, 95, 45)],
    },
  },

  paladin: {
    name: 'Paladin',
    description: 'Holy knight in white and gold armor with blue cape',
    outline: c(20, 20, 30),
    weapon: 'sword',
    regions: {
      hair: [c(200, 180, 100), c(185, 165, 85)],
      skin: [c(235, 205, 175), c(225, 195, 165)],
      tunic: [c(235, 235, 240), c(220, 220, 230), c(245, 245, 250)],
      arms: [c(235, 235, 240), c(215, 215, 225)],
      legs: [c(210, 210, 220), c(200, 200, 210)],
      feet: [c(200, 180, 80), c(185, 165, 70)],
      accent: [c(200, 180, 60), c(220, 200, 80)],
    },
  },

  necromancer: {
    name: 'Necromancer',
    description: 'Pale dark sorcerer in black robes with green accents',
    outline: c(10, 10, 10),
    weapon: 'staff',
    regions: {
      hair: [c(20, 20, 25), c(15, 15, 20)],
      skin: [c(200, 200, 210), c(190, 190, 200)],
      tunic: [c(30, 28, 35), c(40, 38, 45), c(25, 23, 30)],
      arms: [c(30, 28, 35), c(35, 33, 40)],
      legs: [c(25, 23, 30), c(30, 28, 35)],
      feet: [c(20, 18, 25), c(15, 13, 20)],
      accent: [c(40, 180, 60), c(30, 160, 50)],
    },
  },

  pirate: {
    name: 'Pirate',
    description: 'Swashbuckler with red bandana, white shirt, and dark coat',
    outline: c(20, 15, 10),
    weapon: 'sword',
    regions: {
      hair: [c(30, 25, 20), c(25, 20, 15)],
      skin: [c(215, 175, 135), c(205, 165, 125)],
      tunic: [c(230, 225, 215), c(215, 210, 200), c(200, 195, 185)],
      arms: [c(50, 40, 35), c(60, 50, 45)],
      legs: [c(50, 40, 35), c(60, 50, 40)],
      feet: [c(40, 30, 20), c(35, 25, 15)],
      accent: [c(180, 35, 25), c(200, 45, 35)],
    },
  },

  robot: {
    name: 'Robot',
    description: 'Metallic android with blue visor and chrome plating',
    outline: c(20, 25, 30),
    weapon: 'none',
    regions: {
      hair: [c(140, 150, 160), c(130, 140, 150)],
      skin: [c(60, 140, 210), c(50, 120, 190)],
      tunic: [c(160, 170, 180), c(175, 185, 195), c(145, 155, 165)],
      arms: [c(150, 160, 170), c(140, 150, 160)],
      legs: [c(130, 140, 150), c(140, 150, 160)],
      feet: [c(100, 110, 120), c(90, 100, 110)],
      accent: [c(60, 180, 220), c(40, 160, 200)],
    },
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

/**
 * Get a random color from a region's color array, with slight per-pixel
 * variation to avoid flat patches looking lifeless.
 */
export function pickRegionColor(colors: Color[]): Color {
  const base = colors[Math.floor(Math.random() * colors.length)];
  // Tiny per-pixel jitter (±5) to add pixel-art texture
  const jitter = () => Math.floor(Math.random() * 11) - 5;
  return {
    r: Math.max(0, Math.min(255, base.r + jitter())),
    g: Math.max(0, Math.min(255, base.g + jitter())),
    b: Math.max(0, Math.min(255, base.b + jitter())),
    a: 255,
  };
}

/**
 * Determine which body region a pixel belongs to, based on its
 * normalized position within the sprite grid.
 */
export function getBodyRegion(
  x: number,
  y: number,
  size: number
): keyof CharacterTemplate['regions'] {
  const cx = Math.floor(size / 2);
  const ny = y / size;
  const nx = Math.abs(x - cx) / (size / 2);

  // Head region: top 25%
  if (ny < 0.15) return 'hair';
  if (ny < 0.25) return 'skin'; // face

  // Neck
  if (ny < 0.30 && nx < 0.15) return 'skin';

  // Arms extend beyond torso width
  if (ny >= 0.25 && ny < 0.56 && nx > 0.42) return 'arms';

  // Belt / accent line between torso and legs
  if (ny >= 0.55 && ny < 0.62) return 'accent';

  // Torso
  if (ny >= 0.25 && ny < 0.60) return 'tunic';

  // Feet at the very bottom
  if (ny >= 0.90) return 'feet';

  // Legs
  if (ny >= 0.60) return 'legs';

  return 'tunic';
}
