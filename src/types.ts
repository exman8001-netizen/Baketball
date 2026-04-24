export interface RampConfig {
  width: number;
  height: number;
  angle: number;
  boostForce: number;
  color: string;
}

export interface ElevatorConfig {
  width: number;
  height: number;
  speed: number;
  range: number;
  color: string;
}

export interface SpikeTrapConfig {
  width: number;
  height: number;
  spikeCount: number;
  isInstantKill: boolean;
}

export interface PropConfig {
  width: number;
  height: number;
  type: 'water_bottle' | 'trophy' | 'bench' | 'basketball_rack' | 'cone' | 'whistle' | 'glass_table' | 'car' | 'pole' | 'crate' | 'barrel' | 'statue';
  color: string;
  isPhysical: boolean;
  mass: number;
  isBreakable?: boolean;
}

export interface RoomObject {
  id: string;
  type: 'hoop' | 'platform' | 'ramp' | 'elevator' | 'spike_trap' | 'prop' | 'fixed_hoop' | 'bounce_pad' | 'gravity_zone' | 'gate' | 'button' | 'breakable_platform' | 'tape';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  angle: number;
  config: any; // specific config (HoopConfig, PlatformConfig, RampConfig, etc.)
  behavior: 'static' | 'moving' | 'falling' | 'destroyable' | 'physics' | 'trigger';
  
  // Movement System
  movement?: {
    type: 'none' | 'horizontal' | 'vertical' | 'circular' | 'path';
    speed: number;
    range: number;
    phase?: number;
    isActive: boolean;
  };

  // Logic System
  logic?: {
    targetId?: string; // ID of the object this one affects (e.g. door, platform)
    action?: 'toggle' | 'activate' | 'destroy' | 'boost';
    state: boolean;
    requiredTeam?: string;
  };

  isDestroyed?: boolean;
  velocity?: { x: number; y: number };
  angularVelocity?: number;
  initialPos?: { x: number; y: number };
}

export interface FixedHoopConfig {
  side: 'left' | 'right' | 'none';
  hasBackboard: boolean;
  hasColumn: boolean;
  color: string;
  scoreValue: number;
  moveable?: boolean;
}

export interface BouncePadConfig {
  force: number;
  color: string;
  cooldown: number;
}

export interface GravityZoneConfig {
  gravityMultiplier: number;
  color: string;
  shape: 'box' | 'circle';
}

export interface GateConfig {
  isOpen: boolean;
  color: string;
  closeSpeed: number;
}

export interface ButtonConfig {
  pressedColor: string;
  unpressedColor: string;
  isToggle: boolean;
  resetTime: number; // 0 for permanent
}

export interface WindowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomConfig {
  id: string;
  name: string;
  creatorId: string;
  worldWidth: number;
  worldHeight: number;
  maxPlayers: number;
  matchTimeLimit: number; // seconds
  gravityOverride?: number;
  floorColor?: string;
  backgroundType?: 'space' | 'street' | 'park' | 'stadium_day' | 'stadium_night' | 'gym' | 'urban';
  objects: RoomObject[];
  hasWall?: boolean;
  hasCeiling?: boolean;
  wallWidth?: number;
  ceilingHeight?: number;
  windows?: WindowConfig[];
  enableEvolution?: boolean;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  score: number;
  baskets: number;
  kills: number;
  deaths: number;
  level: number;
  color: string;
  ballConfig: BallConfig;
  roomId?: string;

  // Persistent / Profile Stats (Simulated)
  stats?: {
    totalKills: number;
    totalDeaths: number;
    totalBaskets: number;
    totalScore: number;
    matchesWon: number;
    matchesPlayed: number;
    playtimeHours: number;
    likes: number;
    bio: string;
    favoriteTeam: string;
    favoritePlayer: string;
  };
}

export type BallRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BallConfig {
  // Size
  sizePreset: 'mini' | 'normal' | 'large' | 'giant' | 'custom';
  scale: number; // 0.5 to 2.0

  // Style / Brand
  style: 'pro' | 'street' | 'playground' | 'vintage' | 'futuristic' | 'training' | 'team';
  
  // Colors
  primaryColor: string;
  lineColor: string;
  glowColor: string;
  useRgbEditor: boolean;

  // Material / Texture
  material: 'leather' | 'rubber' | 'synthetic' | 'chrome' | 'lava' | 'ice' | 'energy' | 'metal';
  roughness: number;
  metalness: number;

  // Details
  grooveThickness: number;
  showGlow: boolean;
  printText: string;
  printedNumber: string;
  playerName?: string;
  teamName?: string;
  teamLogo?: string; // URL or emoji or special char

  // Effects
  trailType: 'none' | 'smoke' | 'fire' | 'electric' | 'neon' | 'particles';
  onPointEffect: 'none' | 'explosion' | 'confetti' | 'implosion';
  auraType: 'none' | 'legendary' | 'shadow' | 'holy';

  // Physics Visual
  rotationSpeedMultiplier: number;
  reflectionIntensity: number;

  // Battle & Dynamic Stats
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  energyRechargeSpeed: number; // 1 to 10
  damage: number; // 1 to 10
  extraJumps: number; // 0 to 5
  airLevel: number; // 0 to 1
  maxAirLevel: number;
  airXp?: number;
  level?: number;
  isLeaking?: boolean;
  knockbackForce: number; // 0 to 10
  weight: number; // impact on physics
  bounciness: number; // impact on physics
  speed: number; // impact on physics

  // System
  rarity: BallRarity;
  isUnlocked: boolean;
}

export const DEFAULT_BALL_CONFIG: BallConfig = {
  sizePreset: 'normal',
  scale: 1,
  style: 'pro',
  primaryColor: '#f97316', // Orange 500
  lineColor: '#000000',
  glowColor: '#fb923c',
  useRgbEditor: false,
  material: 'leather',
  roughness: 0.7,
  metalness: 0.1,
  grooveThickness: 2,
  showGlow: false,
  printText: '',
  printedNumber: '7',
  trailType: 'none',
  onPointEffect: 'explosion',
  auraType: 'none',
  rotationSpeedMultiplier: 1,
  reflectionIntensity: 0.2,
  hp: 100,
  maxHp: 100,
  energy: 100,
  maxEnergy: 100,
  energyRechargeSpeed: 5,
  damage: 5,
  extraJumps: 1,
  airLevel: 1,
  maxAirLevel: 1,
  knockbackForce: 5,
  weight: 5,
  bounciness: 5,
  speed: 5,
  rarity: 'common',
  isUnlocked: true,
};

export const BALL_PRESETS: Record<string, Partial<BallConfig>> = {
  "NBA Classic": {
    style: 'pro',
    primaryColor: '#f97316',
    material: 'leather',
    hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, airLevel: 1, maxAirLevel: 1, knockbackForce: 4, weight: 6, bounciness: 5, speed: 4,
    rarity: 'common'
  },
  "Street Chaos": {
    style: 'street',
    primaryColor: '#4b5563',
    lineColor: '#ffffff',
    material: 'rubber',
    trailType: 'smoke',
    hp: 120, maxHp: 120, energy: 80, maxEnergy: 80, airLevel: 1, maxAirLevel: 1, knockbackForce: 7, weight: 8, bounciness: 6, speed: 3,
    rarity: 'rare'
  },
  "Neon Cyber": {
    style: 'futuristic',
    primaryColor: '#06b6d4',
    lineColor: '#ffffff',
    glowColor: '#22d3ee',
    material: 'chrome',
    showGlow: true,
    trailType: 'neon',
    hp: 80, maxHp: 80, energy: 150, maxEnergy: 150, airLevel: 1, maxAirLevel: 1, knockbackForce: 3, weight: 3, bounciness: 4, speed: 9,
    rarity: 'epic'
  },
  "Fire Dunk": {
    style: 'playground',
    primaryColor: '#ef4444',
    glowColor: '#f87171',
    material: 'lava',
    trailType: 'fire',
    hp: 150, maxHp: 150, energy: 100, maxEnergy: 100, airLevel: 1, maxAirLevel: 1, knockbackForce: 9, weight: 9, bounciness: 3, speed: 5,
    rarity: 'legendary'
  },
  "Ice Precision": {
    style: 'pro',
    primaryColor: '#bae6fd',
    lineColor: '#7dd3fc',
    material: 'ice',
    trailType: 'particles',
    hp: 90, maxHp: 90, energy: 120, maxEnergy: 120, airLevel: 1, maxAirLevel: 1, knockbackForce: 5, weight: 5, bounciness: 8, speed: 7,
    rarity: 'epic'
  },
  "Gold Champion": {
    style: 'team',
    primaryColor: '#eab308',
    lineColor: '#854d0e',
    material: 'metal',
    metalness: 0.9,
    reflectionIntensity: 0.8,
    auraType: 'legendary',
    hp: 200, maxHp: 200, energy: 200, maxEnergy: 200, airLevel: 1, maxAirLevel: 1, knockbackForce: 10, weight: 10, bounciness: 9, speed: 10,
    rarity: 'legendary'
  }
};

export interface HoopType {
  id: string;
  color: string;
  score: number;
  spawnChance: number;
  label: string;
}

export interface PlatformConfig {
  enabled: boolean;
  spawnChance: number; // 0 to 1
  width: number;
  height: number;
  material: 'wood' | 'metal' | 'neon' | 'ice' | 'stone' | 'glass';
  color: string;
  friction: number;
  bounciness: number;
  isBreakable: boolean;
  movementType: 'stationary' | 'horizontal' | 'vertical' | 'rotate' | 'follow-hoop';
  movementSpeed: number;
  hasSupportColumn: boolean;
  columnFlexibility: number;
}

export interface HoopConfig {
  // General
  maxHoops: number;
  spawnInterval: number;
  globalFallSpeed: number;
  spawnPattern: 'random' | 'pairs' | 'staggered' | 'groups';
  multiSpawnChance: number;

  // Movement
  movementType: 'linear' | 'zigzag' | 'wave' | 'diagonal-rl' | 'diagonal-lr' | 'random' | 'circular';
  rotationType: 'none' | 'slow' | 'medium' | 'fast' | 'random';
  individualSpeeds: boolean;
  
  // Angle
  allowedAngles: number[]; // 0, 30, 45, 60, 90
  randomAngleRange: boolean;
  lockAngleByType: boolean;

  // Size & Shape
  baseSize: number;
  sizeVariation: 'fixed' | 'small' | 'medium' | 'large' | 'random';
  borderWidth: number;
  dynamicSizing: 'none' | 'growing' | 'shrinking' | 'pulsing' | 'random' | 'expand-on-hit';

  // Colors & Score
  hoopTypes: HoopType[];

  // Backboard
  backboardEnabled: boolean;
  backboardWidth: number;
  backboardHeight: number;
  backboardTransparent: boolean;
  backboardSolid: boolean; // if false, decoration only
  backboardRotateWithHoop: boolean;

  // Platforms
  platform: PlatformConfig;

  // Net (Satisfactory System)
  netType: 'nylon' | 'rope' | 'neon' | 'energy' | 'fire' | 'chain' | 'metal';
  netLength: number;
  netResolution: number; 
  netThickness: number;
  netStiffness: number;
  netDamping: number;
  netColor: string;
  netTransparency: number;
  netGlowIntensity: number;
  netWidthBottom: number; // 0 to 1, multiplier for bottom width
  netSwingIntensity: number; // multiplier for ambient movement

  // Feedback & Multipliers
  perfectBonus: number;
  perfectMultiplier: number;
  comboEnabled: boolean;
  comboTimeWindow: number; // ms

  // Physics
  bounceOnPlayers: boolean;
  canPushBall: boolean;
  mass: number;
  resistance: number;

  // Intelligence
  adaptiveDifficulty: boolean;
  speedIncreaseOverTime: number;
  complexityIncreaseOverTime: number;

  // New Detailed Scoring Logic
  scoreRimHit: number;        // Points for just touching the rim
  scoreRimRoll: number;       // Points per second while rolling on rim
  scoreSwish: number;         // Points for clean entry
  scoreRimIn: number;         // Points for entering after hitting rim
  scoreEnterBottom: number;   // Points (usually negative) for entering from below
  matchTimeLimit: number;
  
  // World Bounds
  worldWidth: number;
  worldHeight: number;
}

export const DEFAULT_HOOP_CONFIG: HoopConfig = {
  maxHoops: 10,
  spawnInterval: 2000,
  globalFallSpeed: 3,
  spawnPattern: 'random',
  multiSpawnChance: 0.1,
  movementType: 'linear',
  rotationType: 'none',
  individualSpeeds: false,
  allowedAngles: [0],
  randomAngleRange: false,
  lockAngleByType: false,
  baseSize: 60,
  sizeVariation: 'medium',
  borderWidth: 4,
  dynamicSizing: 'none',
  hoopTypes: [
    { id: 'red', color: '#ef4444', score: 1, spawnChance: 0.6, label: 'Vermelho' },
    { id: 'blue', color: '#3b82f6', score: 2, spawnChance: 0.25, label: 'Azul' },
    { id: 'gold', color: '#f59e0b', score: 5, spawnChance: 0.1, label: 'Ouro' },
    { id: 'purple', color: '#a855f7', score: 10, spawnChance: 0.04, label: 'Roxo' },
    { id: 'black', color: '#18181b', score: 25, spawnChance: 0.01, label: 'Preto' },
  ],
  backboardEnabled: true,
  backboardWidth: 80,
  backboardHeight: 60,
  backboardTransparent: true,
  backboardSolid: true,
  backboardRotateWithHoop: false,
  platform: {
    enabled: true,
    spawnChance: 0.2,
    width: 150,
    height: 20,
    material: 'wood',
    color: '#8b4513',
    friction: 0.8,
    bounciness: 0.2,
    isBreakable: false,
    movementType: 'follow-hoop',
    movementSpeed: 0,
    hasSupportColumn: true,
    columnFlexibility: 0.2
  },
  netType: 'nylon',
  netLength: 60,
  netResolution: 5,
  netThickness: 2,
  netStiffness: 0.5,
  netDamping: 0.95,
  netColor: '#ffffff',
  netTransparency: 0.4,
  netGlowIntensity: 0,
  netWidthBottom: 0.6,
  netSwingIntensity: 1.0,
  perfectBonus: 2,
  perfectMultiplier: 1.5,
  comboEnabled: true,
  comboTimeWindow: 3000,
  bounceOnPlayers: true,
  canPushBall: true,
  mass: 1,
  resistance: 0.1,
  adaptiveDifficulty: false,
  speedIncreaseOverTime: 0,
  complexityIncreaseOverTime: 0,
  scoreRimHit: 1,
  scoreRimRoll: 5,
  scoreSwish: 15,
  scoreRimIn: 5,
  scoreEnterBottom: -10,
  matchTimeLimit: 600,
  worldWidth: 4000,
  worldHeight: 2500,
};

export const HOOP_PRESETS: Record<string, HoopConfig> = {
  "Arcade Clássico": {
    ...DEFAULT_HOOP_CONFIG,
    platform: { ...DEFAULT_HOOP_CONFIG.platform, enabled: false },
  },
  "Parkour Vertical": {
    ...DEFAULT_HOOP_CONFIG,
    maxHoops: 15,
    spawnInterval: 1500,
    platform: {
      ...DEFAULT_HOOP_CONFIG.platform,
      enabled: true,
      spawnChance: 0.7,
      width: 180,
      material: 'metal',
      color: '#64748b'
    }
  },
  "Plataformas Caóticas": {
    ...DEFAULT_HOOP_CONFIG,
    maxHoops: 12,
    movementType: 'zigzag',
    platform: {
      ...DEFAULT_HOOP_CONFIG.platform,
      enabled: true,
      spawnChance: 0.9,
      movementType: 'horizontal',
      movementSpeed: 3
    }
  },
  "Trickshot Challenge": {
    ...DEFAULT_HOOP_CONFIG,
    allowedAngles: [45, 60, 90],
    rotationType: 'medium',
    platform: {
      ...DEFAULT_HOOP_CONFIG.platform,
      enabled: true,
      spawnChance: 0.3,
      material: 'glass',
      color: '#00f2ff'
    }
  },
  "Sky City Arena": {
    ...DEFAULT_HOOP_CONFIG,
    globalFallSpeed: 2,
    platform: {
      ...DEFAULT_HOOP_CONFIG.platform,
      enabled: true,
      spawnChance: 1,
      width: 250,
      material: 'stone',
      color: '#444'
    }
  },
  "Caótico Insano": {
    ...DEFAULT_HOOP_CONFIG,
    maxHoops: 20,
    spawnInterval: 800,
    globalFallSpeed: 6,
    multiSpawnChance: 0.5,
    movementType: 'random',
    rotationType: 'fast',
    dynamicSizing: 'pulsing',
    allowedAngles: [0, 45, 90],
  }
};

export interface PhysicsConfig {
  // Base Movement
  ballWeight: number;
  gravity: number;
  maxHorizontalSpeed: number;
  airAcceleration: number;
  airControl: number;
  groundFriction: number;
  airResistance: number;

  // Jumps
  jumpForce: number;
  extraJumps: number;
  secondJumpForce: number;
  jumpCooldown: number;
  cancelFallOnJump: boolean;

  // Shooting (Mode 2)
  gameplayMode: 'jump' | 'throw' | 'mixed';
  maxShootPower: number;
  chargeSpeed: number;
  aimSensitivity: number;
  showTrajectoryLine: boolean;
  aimAssistEnabled: boolean;
  autoResetAfterThrow: boolean;
  throwCooldown: number;
  ballSpinIntensity: number;

  // Bounce / Elasticity
  elasticity: number;
  floorBounceHeight: number;
  wallBounce: number;
  impactEnergyLoss: number;
  rigidity: number; 

  // Rim Collision Details
  rimBounce: number;
  rimElasticity: number;
  rimFriction: number;
  rimSlipChance: number; // Chance to slide in vs bounce out
  rimRollEnabled: boolean;
  rimRollMaxTime: number; // ms
  rimRollRotationSpeed: number;
  rimRollChanceToEnter: number;

  // Backboard Logic
  backboardBounce: number;
  backboardElasticity: number;
  backboardEnergyLoss: number;
  backboardAssist: number; // 0 to 1, pulls ball towards hoop after hit

  // Hoop Physical Reactions
  hoopVibrationIntensity: number;
  hoopTiltStrength: number;
  hoopElasticRecovery: number;

  // Collision
  hitboxSize: number;
  sliding: number;
  playerImpactReaction: number;
  ballPushForce: number;
  hoopBounce: number;

  // Competitive
  maxFallSpeed: number;
  fallControl: number;
  impactRecovery: number;
  momentumAccumulation: number;
  hasAirDash: boolean;
  airDashForce: number;

  // Visuals
  squashStretchEnabled: boolean;
  autoRotation: boolean;
  impactShake: number;
  trailEnabled: boolean;
  trailLength: number;
}

export const PHYSICS_PRESETS: Record<string, PhysicsConfig> = {
  "Arcade Leve": {
    ballWeight: 1,
    gravity: 0.4,
    maxHorizontalSpeed: 15,
    airAcceleration: 0.2,
    airControl: 0.15,
    groundFriction: 0.9,
    airResistance: 0.99,
    jumpForce: -12,
    extraJumps: 2,
    secondJumpForce: -10,
    jumpCooldown: 100,
    cancelFallOnJump: true,
    gameplayMode: 'jump',
    maxShootPower: 25,
    chargeSpeed: 0.5,
    aimSensitivity: 1,
    showTrajectoryLine: true,
    aimAssistEnabled: true,
    autoResetAfterThrow: false,
    throwCooldown: 500,
    ballSpinIntensity: 0.1,
    elasticity: 0.8,
    floorBounceHeight: 0.7,
    wallBounce: 0.6,
    impactEnergyLoss: 0.1,
    rigidity: 0.5,
    rimBounce: 0.6,
    rimElasticity: 0.8,
    rimFriction: 0.1,
    rimSlipChance: 0.4,
    rimRollEnabled: true,
    rimRollMaxTime: 1200,
    rimRollRotationSpeed: 0.2,
    rimRollChanceToEnter: 0.7,
    backboardBounce: 0.7,
    backboardElasticity: 0.9,
    backboardEnergyLoss: 0.1,
    backboardAssist: 0.3,
    hoopVibrationIntensity: 15,
    hoopTiltStrength: 10,
    hoopElasticRecovery: 0.2,
    hitboxSize: 20,
    sliding: 0.1,
    playerImpactReaction: 1,
    ballPushForce: 1,
    hoopBounce: 0.4,
    maxFallSpeed: 10,
    fallControl: 0.05,
    impactRecovery: 0.9,
    momentumAccumulation: 0.1,
    hasAirDash: true,
    airDashForce: 10,
    squashStretchEnabled: true,
    autoRotation: true,
    impactShake: 5,
    trailEnabled: true,
    trailLength: 10
  },
  "NBA Realista": {
    ballWeight: 1.2,
    gravity: 0.5,
    maxHorizontalSpeed: 12,
    airAcceleration: 0.1,
    airControl: 0.05,
    groundFriction: 0.8,
    airResistance: 0.99,
    jumpForce: -9,
    extraJumps: 1,
    secondJumpForce: -7,
    jumpCooldown: 500,
    cancelFallOnJump: false,
    gameplayMode: 'throw',
    maxShootPower: 30,
    chargeSpeed: 0.8,
    aimSensitivity: 1.0,
    showTrajectoryLine: false,
    aimAssistEnabled: false,
    autoResetAfterThrow: true,
    throwCooldown: 1000,
    ballSpinIntensity: 0.5,
    elasticity: 0.6,
    floorBounceHeight: 0.5,
    wallBounce: 0.4,
    impactEnergyLoss: 0.3,
    rigidity: 0.8,
    rimBounce: 0.4,
    rimElasticity: 0.5,
    rimFriction: 0.3,
    rimSlipChance: 0.1,
    rimRollEnabled: true,
    rimRollMaxTime: 2000,
    rimRollRotationSpeed: 0.1,
    rimRollChanceToEnter: 0.4,
    backboardBounce: 0.5,
    backboardElasticity: 0.6,
    backboardEnergyLoss: 0.4,
    backboardAssist: 0.05,
    hoopVibrationIntensity: 10,
    hoopTiltStrength: 8,
    hoopElasticRecovery: 0.1,
    hitboxSize: 18,
    sliding: 0.05,
    playerImpactReaction: 0.8,
    ballPushForce: 0.5,
    hoopBounce: 0.3,
    maxFallSpeed: 15,
    fallControl: 0.02,
    impactRecovery: 0.8,
    momentumAccumulation: 0.05,
    hasAirDash: false,
    airDashForce: 0,
    squashStretchEnabled: true,
    autoRotation: true,
    impactShake: 8,
    trailEnabled: true,
    trailLength: 5
  }
};
