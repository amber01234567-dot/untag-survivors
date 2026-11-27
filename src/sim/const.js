export const TILE = 32;
export const T_WALL = 0, T_FLOOR = 1, T_OBST = 2, T_GATE = 3;
export const SIM_DT = 1 / 60;
export const SNAP_EVERY = 3;           // 每 3 tick 送一次快照 (20Hz)
export const MAX_PLAYERS = 4;
export const VIEW_W = 1170, VIEW_H = 660;

// 網路同步用的視覺種類索引（只能往後追加，不要改順序）
export const PROJ_KINDS = [
  'bullet', 'gatling', 'revolver', 'pistol', 'knife', 'rune', 'wisp', 'syringe', 'skewer', 'bead',
  'wave', 'cleaver', 'baseball', 'laserbolt', 'missile', 'molotov', 'blade', 'dronebolt',
  'e_can', 'e_spore', 'e_orb', 'e_laser', 'e_trash', 'e_chain', 'grenade', 'note', 'fireball', 'kart',
  'starwave', 'wheel', 'fist', 'thunderball', 'tracer', 'lance', 'glaive', 'nuke', 'meatslice', 'moneybag', 'kamikaze',
  'e_ice',
];
export const ZONE_KINDS = [
  'mine', 'rune', 'runebig', 'blackhole', 'fire', 'frost', 'beam', 'pulse', 'heal', 'grill',
  'e_warn', 'e_slam', 'e_beam', 'garbage', 'seal', 'whirl', 'bell', 'airstrike', 'mark', 'shadow', 'toxic', 'decoy', 'aura', 'dragonfire', 'crack', 'zero',
  'skyblade', 'reticle', 'bigwheel', 'rockburst', 'chopmark', 'cleaverfall', 'doomcircle', 'maw', 'mushroom', 'gravball', 'cashnado', 'breath', 'dragonpass', 'peel',
];
// 角色造型索引（快照用，只能往後加）：對應 assets/sprites/<角色>_<造型>_*.png
export const SKINS = ['', 'siege', 'evo', 'siege_evo'];
export const SUMMON_KINDS = ['drone', 'cat', 'lion', 'rat', 'wisp', 'turret', 'tank', 'skull', 'bit', 'kebab', 'mothership', 'tiger', 'goldtank', 'dragon'];

export const BUFF_BITS = { dmg: 1, haste: 2, speed: 4, shield: 8, invuln: 16, heal: 32, stealth: 64, ult: 128 };
