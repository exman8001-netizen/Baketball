import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { PhysicsConfig, HoopConfig, BallConfig, Player, RoomConfig, RoomObject } from "../types";
import { Crown, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GameCanvasProps {
  socket: Socket;
  players: Record<string, Player>;
  myId: string;
  playerName: string;
  physics: PhysicsConfig;
  hoopConfig: HoopConfig;
  initialHoops: any[];
  ballConfig: BallConfig;
  roomId?: string;
  roomConfig?: RoomConfig;
}

interface Hoop {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  displaySize: number;
  initialSize: number;
  scored?: boolean;
  type: { color: string; score: number; id: string };
  angle: number;
  rotationSpeed: number;
  spawnTime: number;
  movementOffset: number;
  movementType: string;
  dynamicSizing: string;
  hasPlatform: boolean;
  platform: any;
  net: NetSimulation;
  
  // Physical Replay State
  currentTilt: number;
  vibrationOffset: number;
  vibrationDecay: number;

  // New behaviors
  behavior?: 'static' | 'moving' | 'falling' | 'destroyable';
  isFalling?: boolean;
  isDestroyed?: boolean;
  fallVelocity?: number;
}

interface NetNode {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

class NetSimulation {
  nodes: NetNode[][] = []; // [columns][rows]
  config: HoopConfig;
  lastAnchorX?: number;
  lastAnchorY?: number;
  swishEnergy = 0;

  constructor(x: number, y: number, radius: number, config: HoopConfig) {
    this.config = config;
    this.lastAnchorX = x;
    this.lastAnchorY = y;
    const cols = Math.max(8, config.netResolution + 3);
    const rows = config.netResolution;
    const spacingVertical = config.netLength / rows;

    for (let i = 0; i < cols; i++) {
      this.nodes[i] = [];
      const angle = (i / cols) * Math.PI * 2;
      const startX = x + Math.cos(angle) * (radius / 2);
      const startY = y;

      for (let j = 0; j < rows; j++) {
        // Taper effect
        const taper = 1 - (j / rows) * (1 - config.netWidthBottom);
        const nodeX = startX + Math.cos(angle) * (radius / 2) * (taper - 1);
        const nodeY = startY + j * spacingVertical;
        this.nodes[i][j] = {
          x: nodeX,
          y: nodeY,
          oldX: nodeX,
          oldY: nodeY,
          pinned: j === 0
        };
      }
    }
  }

  update(anchorX: number, anchorY: number, radius: number, angle: number, ball?: { x: number, y: number, r: number, vx: number, vy: number }) {
    const cols = this.nodes.length;
    const rows = this.nodes[0].length;
    const now = Date.now();

    // Displacement injection
    if (this.lastAnchorX !== undefined && this.lastAnchorY !== undefined) {
        const dx = anchorX - this.lastAnchorX;
        const dy = anchorY - this.lastAnchorY;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const node = this.nodes[i][j];
                node.x += dx;
                node.y += dy;
                node.oldX += dx;
                node.oldY += dy;
            }
        }
    }
    this.lastAnchorX = anchorX;
    this.lastAnchorY = anchorY;

    // Update pinned positions
    for (let i = 0; i < cols; i++) {
        const nodeAngle = (i / cols) * Math.PI * 2 + angle;
        this.nodes[i][0].x = anchorX + Math.cos(nodeAngle) * (radius / 2);
        this.nodes[i][0].y = anchorY + Math.sin(nodeAngle) * (radius / 10);
    }

    // Swish Decay
    this.swishEnergy *= 0.92;

    // Verlet integration & Gravity
    const gravity = this.config.netType === 'chain' || this.config.netType === 'metal' ? 0.35 : 0.22;
    const swing = (Math.sin(now * 0.002) * 0.15) * this.config.netSwingIntensity;

    for (let i = 0; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        const node = this.nodes[i][j];
        const vx = (node.x - node.oldX) * this.config.netDamping;
        const vy = (node.y - node.oldY) * this.config.netDamping;

        node.oldX = node.x;
        node.oldY = node.y;

        node.x += vx + swing * (j / rows);
        node.y += vy + gravity;

        // Ball collision
        if (ball) {
            const dx = node.x - ball.x;
            const dy = node.y - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = ball.r * 1.35;
            
            if (dist < interactionRadius) {
                const strength = (interactionRadius - dist) / interactionRadius;
                const nx = dx / dist;
                const ny = dy / dist;
                
                // Swish dynamic
                if (ball.vy > 1.5) {
                    this.swishEnergy = Math.min(this.swishEnergy + ball.vy * 0.2, 15);
                    node.y += ball.vy * 0.4 * strength;
                    node.x += ball.vx * 0.2 * strength;
                }

                // "Caught on rim" potential: if ball is jammed or hitting hard upward
                if (ball.vy < -2 && dist < interactionRadius * 0.8) {
                    node.y -= 10 * strength; // Net gets flipped up
                    node.oldY = node.y + 5; // Sustain the upward momentum
                }

                node.x += nx * strength * (5 + this.swishEnergy);
                node.y += ny * strength * (5 + this.swishEnergy);
            }
        }
      }
    }

    // Constraints
    const iterations = this.config.netType === 'chain' ? 8 : 4;
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (let i = 0; i < cols; i++) {
        const taper = 1 - (1 / rows) * (1 - this.config.netWidthBottom);
        const hDist = (radius * Math.PI * taper) / cols;
        const vDist = this.config.netLength / rows;

        for (let j = 0; j < rows; j++) {
          if (j < rows - 1) {
            this.solveConstraint(this.nodes[i][j], this.nodes[i][j+1], vDist);
          }
          const nextI = (i + 1) % cols;
          this.solveConstraint(this.nodes[i][j], this.nodes[nextI][j], hDist);
        }
      }
    }
  }

  solveConstraint(n1: NetNode, n2: NetNode, dist: number) {
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const currentDist = Math.sqrt(dx * dx + dy * dy);
    if (currentDist < 0.001) return;
    const diff = (dist - currentDist) / currentDist;
    const stiffness = this.config.netType === 'chain' || this.config.netType === 'metal' ? 0.3 : this.config.netStiffness;
    const offsetX = dx * diff * stiffness;
    const offsetY = dy * diff * stiffness;

    if (n1.pinned) {
        n2.x += offsetX * 2;
        n2.y += offsetY * 2;
    } else if (n2.pinned) {
        n1.x -= offsetX * 2;
        n1.y -= offsetY * 2;
    } else {
        n1.x -= offsetX;
        n1.y -= offsetY;
        n2.x += offsetX;
        n2.y += offsetY;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const cols = this.nodes.length;
    const rows = this.nodes[0].length;
    const time = Date.now() / 1000;
    
    ctx.save();
    let drawColor = this.config.netColor;
    let drawThickness = this.config.netThickness;
    let drawAlpha = this.config.netTransparency;

    const isMetal = this.config.netType === 'chain' || this.config.netType === 'metal';

    if (this.config.netType === 'energy') {
        drawAlpha *= (0.5 + Math.sin(time * 10) * 0.5);
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
    } else if (this.config.netType === 'fire') {
        drawColor = `rgb(255, ${Math.floor(100 + Math.random() * 80)}, 0)`;
        drawAlpha = 0.8 + Math.random() * 0.2;
    } else if (this.config.netType === 'rope') {
      drawThickness *= 1.8;
    } else if (this.config.netType === 'neon') {
      drawAlpha = 0.8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = drawColor;
    } else if (isMetal) {
        drawColor = "#94a3b8";
        drawThickness = Math.max(1, drawThickness * 0.7);
    }

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawThickness;
    ctx.globalAlpha = drawAlpha;
    
    if (this.config.netGlowIntensity > 0) {
        ctx.shadowBlur = this.config.netGlowIntensity;
        ctx.shadowColor = drawColor;
    }
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const drawSegment = (x1: number, y1: number, x2: number, y2: number) => {
        if (isMetal) {
            // Draw a chain link
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            ctx.save();
            ctx.translate(x1 + dx / 2, y1 + dy / 2);
            ctx.rotate(angle);
            ctx.beginPath();
            // Link shape
            ctx.ellipse(0, 0, dist / 2 + 3, drawThickness * 2, 0, 0, Math.PI * 2);
            
            if (this.config.netType === 'metal') {
                ctx.strokeStyle = "#94a3b8"; // Steel
            } else {
                ctx.strokeStyle = "#fbbf24"; // Brass/Gold chain
            }
            ctx.stroke();
            
            // Shine on link
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = drawThickness * 0.5;
            ctx.ellipse(0, -drawThickness, dist / 4, 1, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    // Draw vertical strings
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows - 1; j++) {
        let x1 = this.nodes[i][j].x;
        let y1 = this.nodes[i][j].y;
        let x2 = this.nodes[i][j+1].x;
        let y2 = this.nodes[i][j+1].y;
        
        if (this.config.netType === 'energy') {
            x2 += (Math.random() - 0.5) * 5;
        } else if (this.config.netType === 'fire') {
            x2 += (Math.random() - 0.5) * 6;
            y2 -= Math.random() * 4;
        }
        drawSegment(x1, y1, x2, y2);
      }
    }

    // Draw horizontal rings
    ctx.globalAlpha = drawAlpha * 0.7;
    for (let j = 1; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const nextI = (i + 1) % cols;
        drawSegment(this.nodes[i][j].x, this.nodes[i][j].y, this.nodes[nextI][j].x, this.nodes[nextI][j].y);
      }
    }
    ctx.restore();
  }
}

interface VisualFeedback {
    x: number;
    y: number;
    text: string;
    color: string;
    size: number;
    alpha: number;
    vy: number;
    id: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

const playSwishSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const noiseNode = ctx.createBufferSource();
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        
        noiseNode.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1);
        filter.Q.value = 1;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start();
        setTimeout(() => ctx.close(), 200);
    } catch (e) {
        // Silently fail if audio blocked
    }
};

// Helper to draw a customized ball with 3D depth
const drawBall = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number, scale: number, config: BallConfig) => {
  if (!config) return;

  const { 
    primaryColor, 
    lineColor, 
    glowColor, 
    material, 
    grooveThickness,
    showGlow,
    printedNumber,
    reflectionIntensity,
    auraType,
    airLevel = 1.0
  } = config;

  // Use airLevel to scale the radius in-game
  const adjustedRadius = radius * airLevel;

  ctx.save();
  ctx.translate(x, y);

  // Aura Effect
  if (auraType !== 'none') {
    ctx.beginPath();
    ctx.arc(0, 0, adjustedRadius * 1.5, 0, Math.PI * 2);
    const aura = ctx.createRadialGradient(0, 0, adjustedRadius, 0, 0, adjustedRadius * 1.5);
    if (auraType === 'legendary') {
      aura.addColorStop(0, "rgba(234, 179, 8, 0.4)");
      aura.addColorStop(1, "transparent");
    } else if (auraType === 'shadow') {
      aura.addColorStop(0, "rgba(0, 0, 0, 0.6)");
      aura.addColorStop(1, "transparent");
    }
    ctx.fillStyle = aura;
    ctx.fill();
  }

  // 1. Shadow beneath ball
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, adjustedRadius, adjustedRadius * 0.8, adjustedRadius * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.filter = "blur(5px)";
  ctx.fill();
  ctx.restore();

  // 2. Base Ball with Perspective Rotation
  ctx.rotate(rotation);

  // Clip for materials
  ctx.beginPath();
  ctx.arc(0, 0, adjustedRadius, 0, Math.PI * 2);
  ctx.clip();

  // 3D Spherical Gradient
  const ballGrad = ctx.createRadialGradient(-adjustedRadius * 0.3, -adjustedRadius * 0.3, adjustedRadius * 0.1, 0, 0, adjustedRadius);
  if (material === 'lava') {
    ballGrad.addColorStop(0, "#ff7000");
    ballGrad.addColorStop(1, "#330000");
  } else if (material === 'chrome') {
    ballGrad.addColorStop(0, "#f8fafc");
    ballGrad.addColorStop(1, "#1e293b");
  } else if (material === 'ice') {
    ballGrad.addColorStop(0, "#f0f9ff");
    ballGrad.addColorStop(1, "#1d4ed8");
  } else if (material === 'metal') {
    ballGrad.addColorStop(0, primaryColor);
    ballGrad.addColorStop(1, "#000000");
  } else {
    ballGrad.addColorStop(0, primaryColor);
    ballGrad.addColorStop(1, darkenColor(primaryColor, 60));
  }
  ctx.fillStyle = ballGrad;
  ctx.fill();

  // Rim Darkening
  const rim = ctx.createRadialGradient(0, 0, adjustedRadius * 0.85, 0, 0, adjustedRadius);
  rim.addColorStop(0, "transparent");
  rim.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = rim;
  ctx.fill();

  // Grooves (3D Seams)
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(1, (grooveThickness * scale) * airLevel);
  ctx.globalAlpha = 0.7;
  
  // Horizontal seam wrap
  ctx.beginPath();
  ctx.ellipse(0, 0, adjustedRadius, Math.abs(adjustedRadius * Math.sin(rotation * 0.5)), 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Vertical seam wrap
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.abs(adjustedRadius * Math.cos(rotation * 0.5)), adjustedRadius, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1.0;

  // Text
  if (printedNumber) {
    ctx.fillStyle = lineColor;
    ctx.font = `bold ${adjustedRadius * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(printedNumber, 0, adjustedRadius * 0.1);
  }

  // 3. Specular Highlights
  ctx.globalCompositeOperation = "screen";
  const refl = ctx.createRadialGradient(-adjustedRadius * 0.4, -adjustedRadius * 0.4, 0, -adjustedRadius * 0.4, -adjustedRadius * 0.4, adjustedRadius * 0.8);
  refl.addColorStop(0, `rgba(255, 255, 255, ${reflectionIntensity * 0.6})`);
  refl.addColorStop(1, "transparent");
  ctx.fillStyle = refl;
  ctx.fill();
  
  // Glow (Outer)
  if (showGlow) {
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(0, 0, adjustedRadius, 0, Math.PI * 2);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = glowColor;
    ctx.stroke();
  }

  ctx.restore();
};

const drawStats = (ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, air: number) => {
  const barW = 40;
  const barH = 4;
  const offset = 35;
  
  // HP Bar
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x - barW/2, y - offset, barW, barH);
  ctx.fillStyle = "#10b981";
  ctx.fillRect(x - barW/2, y - offset, barW * (hp / maxHp), barH);
  
  // Air Bar
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x - barW/2, y - offset + 6, barW, barH);
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(x - barW/2, y - offset + 6, barW * air, barH);
};

function darkenColor(hex: string, percent: number): string {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ socket, players, myId, playerName, physics, hoopConfig, initialHoops, ballConfig, roomId, roomConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use refs for configs to avoid stale closures in listeners and reduce effect re-runs
  const physicsRef = useRef(physics);
  const hoopConfigRef = useRef(hoopConfig);
  const roomConfigRef = useRef(roomConfig);
  const roomObjectsRef = useRef<RoomObject[]>(roomConfig?.objects || []);

  const [gameStatus, setGameStatus] = useState<'playing' | 'gameOver' | 'eliminated'>('playing');
  const [timeRemaining, setTimeRemaining] = useState(roomConfig?.matchTimeLimit || 600);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(30);
  const [canSkipAd, setCanSkipAd] = useState(false);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setGameStatus('gameOver');
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStatus]);

  useEffect(() => {
    if (showAd) {
      setAdCountdown(30);
      setCanSkipAd(false);
      const interval = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 25) setCanSkipAd(true);
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showAd]);

  const handleRevive = () => {
    const player = playerPosRef.current;
    player.hp = 100;
    player.airLevel = 1.0;
    player.energy = 100;
    setGameStatus('playing');
    setShowAd(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    physicsRef.current = physics;
  }, [physics]);
  useEffect(() => { hoopConfigRef.current = hoopConfig; }, [hoopConfig]);
  useEffect(() => { 
    roomConfigRef.current = roomConfig; 
    if (roomConfig?.objects) {
      roomObjectsRef.current = roomConfig.objects.map(obj => ({
        ...obj,
        initialPos: { x: obj.x, y: obj.y }
      }));
    }
  }, [roomConfig]);

  // Game state
  const hoopsRef = useRef<Hoop[]>([]);
  const scoreRef = useRef(0);
  const basketsRef = useRef(0);
  const leaderboardRef = useRef<any[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const playerPosRef = useRef({ 
    x: 400, 
    y: 2000, 
    z: 0,
    vx: 0, 
    vy: 0, 
    vz: 0,
    targetX: 400,
    lastY: 500,
    rotation: 0,
    jumpsAvailable: physics.extraJumps + 1,
    lastJumpTime: 0,
    squash: 1,
    stretch: 1,
    
    // Advanced Physics State
    rimRollHoopId: null as (number | null),
    rimRollAngle: 0,
    rimRollTime: 0,
    rimRollRadius: 0,
    isStuckOnRim: false,
    stuckUntil: 0,

    // Battle & Physics Stats
    hp: ballConfig.hp || 100,
    maxHp: ballConfig.maxHp || 100,
    energy: ballConfig.energy || 100,
    maxEnergy: ballConfig.maxEnergy || 100,
    airLevel: ballConfig.airLevel || 1.0,
    maxAirLevel: ballConfig.maxAirLevel || 1.0,

    // Burnout State
    isBurnoutCharging: false,
    burnoutPower: 0,
    burnoutAngle: 0,

    // Interaction Subtlety State
    lastOnBackboardHoopId: null as (number | null),
    backboardJumpCount: 0,
    wiggleCount: 0,
    lastWiggleDir: 0,
    lastWiggleTime: 0
  });
  
  const trailRef = useRef<TrailPoint[]>([]);
  const shakeRef = useRef(0);
  const playersRef = useRef(players);
  
  // Feedback & Particle State
  const feedbacksRef = useRef<VisualFeedback[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const comboRef = useRef({ count: 0, lastScoreTime: 0 });

  // Shooting State
  const shootStateRef = useRef({
    isCharging: false,
    power: 0,
    angle: 0,
    lastShootTime: 0,
    feedbackText: "",
    feedbackAlpha: 0,
    isBallInAir: false,
    originX: 400,
    originY: 500
  });

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    // Clear hoops and objects when room changes
    hoopsRef.current = [];
    if (initialHoops.length > 0) {
      initialHoops.forEach(h => handleSpawn(h));
    }
  }, [roomId, initialHoops]);

  useEffect(() => {
    // Reset jumps when physics change
    playerPosRef.current.jumpsAvailable = physics.extraJumps + 1;
  }, [physics.extraJumps]);

  const handleSpawn = (hoopData: any) => {
    const config = hoopConfigRef.current;
    if (!config || !config.allowedAngles) return;

    const rotationSpeeds: any = { none: 0, slow: 0.02, medium: 0.05, fast: 0.1 };
    
    let angle = 0;
    if (config.allowedAngles.length > 0) {
      const baseAngle = config.allowedAngles[Math.floor(Math.random() * config.allowedAngles.length)];
      angle = (baseAngle * Math.PI) / 180;
      if (config.randomAngleRange) {
         angle += (Math.random() - 0.5) * 0.2;
      }
    }

    let size = config.baseSize;
    if (config.sizeVariation === 'small') size *= 0.6;
    if (config.sizeVariation === 'medium') size *= 1.0;
    if (config.sizeVariation === 'large') size *= 1.5;
    if (config.sizeVariation === 'random') size *= (0.5 + Math.random());

    const newHoop: Hoop = {
      ...hoopData,
      size,
      displaySize: size,
      initialSize: size,
      angle,
      rotationSpeed: rotationSpeeds[config.rotationType as any] * (0.8 + Math.random() * 0.4),
      spawnTime: hoopData.createdAt || Date.now(),
      movementOffset: Math.random() * Math.PI * 2,
      movementType: hoopData.movementType || config.movementType,
      dynamicSizing: hoopData.dynamicSizing || config.dynamicSizing,
      hasPlatform: hoopData.hasPlatform,
      platform: hoopData.platform,
      net: new NetSimulation(hoopData.x, hoopData.y, size, config),
      
      currentTilt: 0,
      vibrationOffset: 0,
      vibrationDecay: 0.9
    };
    
    // Prevent duplicates
    if (!hoopsRef.current.some(h => h.id === newHoop.id)) {
      hoopsRef.current.push(newHoop);
    }
  };

  useEffect(() => {
    socket.on("hoop:spawned", handleSpawn);
    
    // Initial jump
    playerPosRef.current.vy = physicsRef.current.jumpForce;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      const player = playerPosRef.current;
      const now = Date.now();
      // Local State Sync & Physics
      const pConfig = physicsRef.current;
      const hConfig = hoopConfigRef.current;

      // HP Check
      if (player.hp <= 0 && gameStatus === 'playing') {
        setGameStatus('eliminated');
      }

      if (!hConfig || !pConfig) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      
      // Update physics
      if (player.isStuckOnRim) {
          if (now > player.stuckUntil) {
              player.isStuckOnRim = false;
          } else {
              player.vy = 0;
              player.vx = 0;
          }
      } else if (player.rimRollHoopId !== null) {
          const hoop = hoopsRef.current.find(h => h.id === player.rimRollHoopId);
          if (hoop) {
              player.rimRollTime += 16;
              player.rimRollAngle += pConfig.rimRollRotationSpeed;
              
              // Score Rim Roll
              if (hConfig.scoreRimRoll !== 0 && Math.random() < 0.1) {
                  scoreRef.current += (hConfig.scoreRimRoll / 10);
                  socket.emit("score:update", { score: Math.round(scoreRef.current), baskets: basketsRef.current });
              }

              const rollX = hoop.x + Math.cos(player.rimRollAngle) * player.rimRollRadius;
              const rollY = hoop.y + Math.sin(player.rimRollAngle) * (player.rimRollRadius * 0.3); // Elliptical roll
              
              player.x = rollX;
              player.y = rollY;
              
              // Exit conditions
              if (player.rimRollTime > pConfig.rimRollMaxTime) {
                  if (Math.random() < pConfig.rimRollChanceToEnter) {
                      player.vy = 5;
                      player.vx = 0;
                  } else {
                      player.vx = Math.cos(player.rimRollAngle) * 5;
                      player.vy = -2;
                  }
                  player.rimRollHoopId = null;
              }
          } else {
              player.rimRollHoopId = null;
          }
      } else {
          player.vy += pConfig.gravity * pConfig.ballWeight;
          player.vy *= pConfig.airResistance;
          player.vx *= pConfig.airResistance;
          
          // 3D Depth Simulation: Slight oscillation and centering
          player.vz *= 0.98; // Air resistance for Z
          player.z += player.vz;
          // Centering force to bring ball back to rim plane
          player.vz += (0 - player.z) * 0.01;
      }
      
      if (player.vy > pConfig.maxFallSpeed) player.vy = pConfig.maxFallSpeed;
      
      const targetVx = (player.targetX - player.x) * pConfig.airControl;
      player.vx += (targetVx - player.vx) * pConfig.airAcceleration;
      
      if (Math.abs(player.vx) > pConfig.maxHorizontalSpeed) {
        player.vx = Math.sign(player.vx) * pConfig.maxHorizontalSpeed;
      }

      player.lastY = player.y; // Track for entry direction
      player.x += player.vx;
      player.y += player.vy;

      // World Clamping - Consolidated with Physics logic below
      if (player.x < 0) { player.x = 0; player.vx *= -0.5; }
      if (player.y < -3000) { player.y = -3000; player.vy = 0; }

      // Camera Follow
      cameraRef.current.x = player.x - width / 2;
      cameraRef.current.y = player.y - height * 0.6;
      
      // Clamp camera
      cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, hConfig.worldWidth - width));
      cameraRef.current.y = Math.max(-1000, Math.min(cameraRef.current.y, hConfig.worldHeight - height));
      
      if (pConfig.autoRotation) {
        player.rotation += player.vx * 0.05;
        if (player.isBurnoutCharging) {
           player.rotation += player.burnoutPower * 0.5;
           // Smoke/Burnout Particles
           if (Math.random() < 0.4) {
              particlesRef.current.push({
                  x: player.x,
                  y: player.y + pConfig.hitboxSize,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 2,
                  size: Math.random() * 10 + 5,
                  color: "rgba(150, 150, 150, 0.4)",
                  life: 0.6
              });
           }
           if (player.burnoutPower > 10 && Math.random() < 0.2) {
              particlesRef.current.push({
                  x: player.x,
                  y: player.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  size: Math.random() * 5 + 2,
                  color: "#ff4500",
                  life: 0.4
              });
           }
        } else {
           player.rotation += player.vx * 0.05 + player.vy * 0.02;
        }
      }

      if (pConfig.trailEnabled) {
        trailRef.current.unshift({ x: player.x, y: player.y, alpha: 1.0 });
        if (trailRef.current.length > pConfig.trailLength) {
          trailRef.current.pop();
        }
        trailRef.current.forEach(t => t.alpha *= 0.9);
      } else {
        trailRef.current = [];
      }

      if (pConfig.squashStretchEnabled) {
        const velMag = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        const stretchAmount = Math.min(velMag * 0.015, 0.6);
        const targetStretch = 1 + stretchAmount;
        const targetSquash = 1 / targetStretch;
        player.stretch += (targetStretch - player.stretch) * 0.2;
        player.squash += (targetSquash - player.squash) * 0.2;
      } else {
        player.stretch = 1;
        player.squash = 1;
      }

      shakeRef.current *= 0.9;

      // Collision and Bounds (World Space)
      if (hConfig.worldHeight > 100) {
        const groundY = hConfig.worldHeight - 50;
        if (player.y > groundY - pConfig.hitboxSize) {
          const impactForce = Math.abs(player.vy);
          player.y = groundY - pConfig.hitboxSize;
          if (impactForce > 2) {
            player.vy = -player.vy * pConfig.floorBounceHeight * pConfig.elasticity;
            shakeRef.current = Math.min(impactForce * pConfig.impactShake, 20);
            if (pConfig.squashStretchEnabled) {
               player.squash = 1.6;
               player.stretch = 0.4;
            }
          } else {
            player.vy = 0;
            player.vx *= pConfig.groundFriction;
          }
          player.jumpsAvailable = pConfig.extraJumps + 1;
        }
        if (player.y < pConfig.hitboxSize) {
          player.y = pConfig.hitboxSize;
          player.vy = Math.abs(player.vy) * 0.5;
        }
      }

      if (player.x < pConfig.hitboxSize) {
        const impact = Math.abs(player.vx);
        player.x = pConfig.hitboxSize;
        player.vx = Math.abs(player.vx) * pConfig.wallBounce;
        if (impact > 10) {
           player.hp = Math.max(0, player.hp - impact * 0.2);
           player.airLevel = Math.max(0.3, player.airLevel - 0.005);
           shakeRef.current += impact * 0.5;
        }
      }
      if (player.x > hConfig.worldWidth - pConfig.hitboxSize) {
        const impact = Math.abs(player.vx);
        player.x = hConfig.worldWidth - pConfig.hitboxSize;
        player.vx = -Math.abs(player.vx) * pConfig.wallBounce;
        if (impact > 10) {
           player.hp = Math.max(0, player.hp - impact * 0.2);
           player.airLevel = Math.max(0.3, player.airLevel - 0.005);
           shakeRef.current += impact * 0.5;
        }
      }

      // Handle Auto-Reset for Throw Mode
      if (pConfig.gameplayMode === 'throw' && shootStateRef.current.isBallInAir) {
         if (Math.abs(player.vx) < 0.1 && Math.abs(player.vy) < 0.1 && player.y >= height - pConfig.hitboxSize) {
            if (pConfig.autoResetAfterThrow && Date.now() - shootStateRef.current.lastShootTime > 1500) {
               player.x = shootStateRef.current.originX;
               player.y = shootStateRef.current.originY;
               player.vx = 0;
               player.vy = 0;
               shootStateRef.current.isBallInAir = false;
            }
         }
      }

      // --- CUSTOM ROOM OBJECTS PHYSICS ---
      roomObjectsRef.current.forEach(obj => {
        if (obj.isDestroyed) return;

        // Update Object Movement (Elevators)
        if (obj.behavior === 'moving' || obj.type === 'elevator') {
          const range = obj.config?.range || obj.movementRange || 400;
          const speed = obj.config?.speed || obj.movementSpeed || 2;
          const initialY = obj.initialPos?.y || obj.y;
          obj.y = initialY + Math.sin(now * 0.002 * speed) * range;
        }

        if (obj.behavior === 'physics') {
          // Apply gravity
          obj.velocity = obj.velocity || { x: 0, y: 0 };
          obj.angularVelocity = obj.angularVelocity || 0;
          
          obj.velocity.y += 0.4; // gravity
          obj.x += obj.velocity.x;
          obj.y += obj.velocity.y;
          obj.angle += obj.angularVelocity;
          
          // Floor collision
          const groundLevel = hConfig.worldHeight - 50;
          if (obj.y + obj.height/2 > groundLevel) {
            obj.y = groundLevel - obj.height/2;
            obj.velocity.y *= -0.3;
            obj.velocity.x *= 0.9;
            obj.angularVelocity *= 0.8;
          }
          
          // Friction / Air Resistance
          obj.velocity.x *= 0.99;
          obj.velocity.y *= 0.99;
          obj.angularVelocity *= 0.98;

          // Damping to stop
          if (Math.abs(obj.angularVelocity) < 0.01) obj.angularVelocity = 0;
          if (Math.abs(obj.velocity.x) < 0.1) obj.velocity.x = 0;
        }

        // Platform Collision Logic for Room Objects (Simple AABB)
        const oL = obj.x - obj.width/2;
        const oR = obj.x + obj.width/2;
        const oT = obj.y - obj.height/2;
        const oB = obj.y + obj.height/2;

        if (
          player.x + pConfig.hitboxSize > oL &&
          player.x - pConfig.hitboxSize < oR &&
          player.y + pConfig.hitboxSize > oT &&
          player.y - pConfig.hitboxSize < oB
        ) {
          if (obj.type === 'spike_trap') {
            // Spike Trap logic: Reset player
            // Create mini explosion visual
            for(let i=0; i<10; i++) {
              particlesRef.current.push({
                x: player.x, y: player.y,
                vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                color: "#ff0000", life: 0.5, size: 4
              });
            }
            player.x = roomConfigRef.current?.worldWidth ? roomConfigRef.current.worldWidth / 2 : width / 2;
            player.y = roomConfigRef.current?.worldHeight ? roomConfigRef.current.worldHeight / 2 : height / 2;
            player.vx = 0; player.vy = 0;
            feedbacksRef.current.push({
               x: player.x, y: player.y - 40, text: "POP!", color: "#ff4444", size: 20, alpha: 1, vy: -1, id: Math.random()
            });
          } else if (obj.type === 'ramp') {
            // Ramp Logic: Boost
            if (player.vy > 0) { // On descent
                player.vy = -Math.abs(player.vy) - (obj.config?.boostForce || 15);
                player.vx += Math.cos(obj.angle * Math.PI / 180) * 10;
                shakeRef.current += 5;
            }
          } else if (obj.type === 'prop' && obj.behavior === 'physics') {
            // "Derrubar" logic: Knock over the prop
            obj.velocity = obj.velocity || { x: 0, y: 0 };
            const dx = player.x - obj.x;
            const dy = player.y - obj.y;
            const impactForce = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            
            obj.velocity.x += -dx * 0.1 * impactForce;
            obj.velocity.y += -dy * 0.1 * impactForce;
            obj.angularVelocity = (obj.angularVelocity || 0) + (Math.random() - 0.5) * impactForce;
            
            shakeRef.current += impactForce * 0.2;
            
            // Re-broadcast movement maybe? For now local only is smoother
          } else {
            // Normal Platform / Elevator
            if (player.vy >= 0 && player.lastY <= oT + 10) {
                 player.y = oT - pConfig.hitboxSize;
                 player.vy = -player.vy * 0.2; // Small bounce
                 player.jumpsAvailable = pConfig.extraJumps + 1;
            }
          }
        }
      });

      socket.emit("player:move", { 
        x: player.x, 
        y: player.y, 
        z: player.z, 
        hp: player.hp, 
        airLevel: player.airLevel, 
        energy: player.energy 
      });

      // --- PLAYER TO PLAYER COLLISION & COMBAT ---
      const playersList = Object.values(playersRef.current || {}) as Player[];
      const otherPlayers = playersList.filter(p => p.id !== myId && p.roomId === roomId);
      otherPlayers.forEach(other => {
        const dx = player.x - other.x;
        const dy = player.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (pConfig.hitboxSize * player.airLevel) + (pConfig.hitboxSize * (other.ballConfig?.airLevel || 1.0));

        if (dist < minDist && dist > 0) {
           // Resolve Collision (Elastic)
           const nx = dx / dist;
           const ny = dy / dist;
           
           // Relative velocity
           // We don't have other player's velocity easily available in the current frame 
           // unless we track it. For now, use local player's velocity as impact force.
           const impactForce = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
           
           if (impactForce > 5) {
              // Damage logic
              const damage = impactForce * 0.5 * (ballConfig.knockbackForce || 5) / 5;
              player.hp = Math.max(0, player.hp - damage);
              player.airLevel = Math.max(0.3, player.airLevel - impactForce * 0.001);
              
              shakeRef.current += impactForce * 0.5;
              
              // Knockback
              player.vx += nx * (other.ballConfig?.knockbackForce || 5) * 0.5;
              player.vy += ny * (other.ballConfig?.knockbackForce || 5) * 0.5;
              
              feedbacksRef.current.push({
                x: player.x, y: player.y - 20, 
                text: `-${Math.round(damage)}HP`, 
                color: "#f87171", size: 15, alpha: 1, vy: -1, id: Math.random()
              });
           }
           
           // Positional correction
           const overlap = minDist - dist;
           player.x += nx * overlap * 0.5;
           player.y += ny * overlap * 0.5;
        }
      });

      // Air Leak overtime based on speed
      const speedSq = player.vx * player.vx + player.vy * player.vy;
      if (speedSq > 100) {
         player.airLevel = Math.max(0.3, player.airLevel - 0.00005);
         if (now % 20 === 0) {
           particlesRef.current.push({
             x: player.x, y: player.y, 
             vx: -player.vx * 0.2, vy: -player.vy * 0.2,
             color: "rgba(255,255,255,0.3)", life: 0.3, size: 2
           });
         }
      }

      // Energy Regen
      if (player.energy < player.maxEnergy) {
         player.energy = Math.min(player.maxEnergy, player.energy + 0.1);
      }

      hoopsRef.current = hoopsRef.current.filter(hoop => {
         const elapsed = (now - hoop.spawnTime) / 1000;
        let fallSpeed = hoop.speed;
        if (hConfig.adaptiveDifficulty) {
           const timeScale = (now - hoop.spawnTime) / 10000;
           fallSpeed += timeScale * hConfig.speedIncreaseOverTime;
        }

        // Apply shared server-side patterns to client prediction
        if (hoop.isFalling) {
           hoop.fallVelocity = (hoop.fallVelocity || 0) + 0.5; // Gravity on hoop
           hoop.y += hoop.fallVelocity;
           hoop.angle += hoop.fallVelocity * 0.01;
        } else {
           hoop.y += fallSpeed;
        }

        if (hoop.movementType === 'zigzag') {
          hoop.x += Math.sin(elapsed * 5) * 4;
        } else if (hoop.movementType === 'wave') {
          hoop.x += Math.cos(elapsed * 2) * 6;
        } else if (hoop.movementType === 'diagonal-rl') {
          hoop.x -= fallSpeed * 0.5;
        } else if (hoop.movementType === 'diagonal-lr') {
          hoop.x += fallSpeed * 0.5;
        } else if (hoop.movementType === 'circular') {
          hoop.x += Math.sin(elapsed * 3) * 5;
          hoop.y += Math.cos(elapsed * 3) * 2;
        }

        if (hoop.x < 50) hoop.x = 50;
        if (hoop.x > width - 50) hoop.x = width - 50;
        // Hoop Vibration Decay
        hoop.vibrationOffset *= hoop.vibrationDecay;
        hoop.currentTilt *= 0.95;

        const dxBall = player.x - hoop.x;
        const dyBall = player.y - hoop.y;
        
        // 1. Backboard Collision (Depth Aware)
        if (hConfig.backboardEnabled) {
             const bbWidth = hConfig.backboardWidth;
             const bbHeight = hConfig.backboardHeight;
             const bbX = hoop.x - bbWidth/2;
             const bbTop = hoop.y - hoop.displaySize/2 - bbHeight;
             const bbBottom = hoop.y - hoop.displaySize/2;
             
             // Depth check: Only collide if ball is near the backboard plane
             const IS_NEAR_PLANE = Math.abs(player.z) < 15;
             
             // Backboard Fatigue & Wiggle Check
             const isWigglingToDrop = player.wiggleCount > 4;
             const isFatigued = player.lastOnBackboardHoopId === hoop.id && player.backboardJumpCount > 5;
             const shouldPassThrough = isWigglingToDrop || (isFatigued && Math.random() < 0.1);

             if (IS_NEAR_PLANE && !shouldPassThrough &&
                 player.x + 15 > bbX && player.x - 15 < bbX + bbWidth &&
                 player.y + 15 > bbTop && player.y - 15 < bbBottom) {
                 
                 // Specific surface reactions
                 const isHittingTop = player.y < bbTop + 10 && player.vy > 0;
                 const isHittingSide = player.x < bbX + 5 || player.x > bbX + bbWidth - 5;
                 
                 if (isHittingTop) {
                    // Stable Landing on Top Edge
                    player.y = bbTop - 15;
                    player.vy = 0;
                    player.vx *= 0.8; // Friction on top
                    
                    // Track fatigue
                    if (player.lastOnBackboardHoopId !== hoop.id) {
                        player.lastOnBackboardHoopId = hoop.id;
                        player.backboardJumpCount = 0;
                    }
                    player.jumpsAvailable = pConfig.extraJumps + 1; // RESET JUMPS
                    
                    // Aim Assist: Nudge towards center of backboard top for stability
                    if (pConfig.aimAssistEnabled) {
                        player.x += (hoop.x - player.x) * (pConfig.backboardAssist * 0.1);
                    }

                    if (Math.random() < 0.1) {
                         hoop.vibrationOffset = 2;
                    }
                 } else if (isHittingSide) {
                    player.vx = -player.vx * pConfig.backboardBounce;
                 } else {
                    player.vx = -player.vx * pConfig.backboardBounce * (1 - pConfig.backboardEnergyLoss);
                    player.vy = -player.vy * pConfig.backboardBounce * (1 - pConfig.backboardEnergyLoss);
                    
                    // Critical Slide: If hit specifically, guide into hoop
                    if (pConfig.backboardAssist > 0 && Math.abs(player.x - hoop.x) < 30) {
                        // Intelligent Nudge: Influence based on backboard assist
                        const nudgeStrength = pConfig.backboardAssist * 0.2;
                        player.vx += (hoop.x - player.x) * nudgeStrength;
                        player.vy += 2 * pConfig.backboardAssist;
                        // Also nudge depth to ensure it stays in plane for swish
                        player.vz += (0 - player.z) * nudgeStrength;
                    }
                 }
                 
                 // Push ball slightly in Z to indicate impact
                 player.vz = -2;
                 
                 hoop.vibrationOffset = pConfig.hoopVibrationIntensity;
                 shakeRef.current += 3;
             } else if (shouldPassThrough && isWigglingToDrop) {
                 // Subtle Nudge into the Rim when dropping through
                 if (pConfig.aimAssistEnabled) {
                    player.x += (hoop.x - player.x) * 0.05;
                    player.z += (0 - player.z) * 0.05;
                 }
                 if (now - player.lastWiggleTime > 1000) player.wiggleCount = 0;
             }
        }

        // 2. Rim Collision (Depth Aware)
        const rimRX = hoop.displaySize / 2;
        const rimRY = hoop.displaySize / 5;
        const angleToBall = Math.atan2(dyBall * 2.5, dxBall);
        const rimX = hoop.x + Math.cos(angleToBall) * rimRX;
        const rimY = hoop.y + Math.sin(angleToBall) * rimRY;
        const distRim = Math.sqrt(Math.pow(player.x - rimX, 2) + Math.pow(player.y - rimY, 2));

        // Rim is at Z=0. Only hit if Z is close to 0.
        if (distRim < 20 && !hoop.scored && Math.abs(player.z) < 10) {
             // Score Rim Hit
             if (hConfig.scoreRimHit !== 0) {
                scoreRef.current += hConfig.scoreRimHit;
                socket.emit("score:update", { score: scoreRef.current, baskets: basketsRef.current });
             }

             if (pConfig.rimRollEnabled && player.vy > 0 && Math.random() < 0.4 && player.rimRollHoopId === null) {
                  player.rimRollHoopId = hoop.id;
                  player.rimRollAngle = angleToBall;
                  player.rimRollRadius = rimRX;
                  player.rimRollTime = 0;
             } else {
                  const nX = (player.x - rimX) / distRim;
                  const nY = (player.y - rimY) / distRim;
                  const dot = player.vx * nX + player.vy * nY;
                  
                  // Bounce logic
                  player.vx = (player.vx - 2 * dot * nX) * pConfig.rimBounce;
                  player.vy = (player.vy - 2 * dot * nY) * pConfig.rimBounce;
                  
                  // Depth Kick: Bounce slightly forward or backward in Z
                  player.vz = (player.z > 0 ? 3 : -3) * Math.random();

                  if (Math.random() < pConfig.rimSlipChance) player.vx += (hoop.x - player.x) * 0.1;

                  hoop.vibrationOffset = pConfig.hoopVibrationIntensity;
                  hoop.currentTilt = (player.vx > 0 ? 1 : -1) * pConfig.hoopTiltStrength;
                  shakeRef.current += 2;
             }
        }

        if (hoop.dynamicSizing === 'growing') {
          hoop.displaySize = hoop.initialSize * (1 + elapsed * 0.1);
        } else if (hoop.dynamicSizing === 'shrinking') {
          hoop.displaySize = hoop.initialSize * Math.max(0.2, 1 - elapsed * 0.1);
        } else if (hoop.dynamicSizing === 'pulsing') {
          hoop.displaySize = hoop.initialSize * (1 + Math.sin(elapsed * 5) * 0.2);
        } else {
          hoop.displaySize = hoop.size;
        }

        // Platform Collisions
        if (hoop.hasPlatform && hoop.platform) {
          const plat = hoop.platform;
          const platX = hoop.x - plat.width / 2;
          const platY = hoop.y + hoop.size / 2 + 10;
          
          if (
            player.x + pConfig.hitboxSize > platX &&
            player.x - pConfig.hitboxSize < platX + plat.width &&
            player.y + pConfig.hitboxSize > platY &&
            player.y - pConfig.hitboxSize < platY + plat.height &&
            player.vy >= 0 // Falling onto platform
          ) {
            player.y = platY - pConfig.hitboxSize;
            player.vy = -player.vy * plat.bounciness;
            player.vx *= plat.friction;
            player.jumpsAvailable = pConfig.extraJumps + 1;
          }
        }

        const isEnteringFromBelow = player.vy < 0 && player.lastY > hoop.y && player.y <= hoop.y;
        const isEnteringFromAbove = player.vy > 0 && player.lastY < hoop.y && player.y >= hoop.y;

        if (!hoop.scored && (isEnteringFromAbove || isEnteringFromBelow)) {
          const dx = player.x - hoop.x;
          const dy = player.y - hoop.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < hoop.size / 2 && Math.abs(dy) < 25) {
            
            if (isEnteringFromBelow) {
                // Illegal Entry / Penalty
                hoop.scored = true;
                scoreRef.current += hConfig.scoreEnterBottom;
                socket.emit("score:update", { score: scoreRef.current, baskets: basketsRef.current });
                feedbacksRef.current.push({
                   x: hoop.x, y: hoop.y - 30, text: "ILLEGAL ENTRY!", color: "#ef4444", size: 15, alpha: 1, vy: -1, id: Math.random()
                });
                return true;
            }

            // Jam Chance: If shot is very slow and centered, it might "jam" for a split second
            if (Math.abs(player.vy) < 3 && Math.abs(dx) < 10 && !player.isStuckOnRim && Math.random() < 0.3) {
                player.isStuckOnRim = true;
                player.stuckUntil = now + 400 + Math.random() * 400;
                player.x = hoop.x + (Math.random() - 0.5) * 4;
                player.y = hoop.y;
                feedbacksRef.current.push({
                    x: hoop.x,
                    y: hoop.y - 30,
                    text: "JAMMED!",
                    color: "#fca5a5",
                    size: 20,
                    alpha: 1.0,
                    vy: -1,
                    id: Math.random()
                });
                return true; // Don't score yet, wait for jam to end
            }
            
            hoop.scored = true;
            
            // Score Calculation
            let addedScore = hoop.type.score;
            let feedback = "GOOD";
            let feedbackColor = hoop.type.color;

            // Check for Perfect Shot (Low horizontal distance from center when hit)
            if (Math.abs(dx) < hoop.size / 8) {
               feedback = "PERFECT!";
               feedbackColor = "#fb923c";
               addedScore = (addedScore * hConfig.perfectMultiplier) + hConfig.perfectBonus;
               shakeRef.current += 10;
            }

            // Combo Logic
            if (hConfig.comboEnabled) {
                if (now - comboRef.current.lastScoreTime < hConfig.comboTimeWindow) {
                    comboRef.current.count++;
                    addedScore *= comboRef.current.count;
                    if (comboRef.current.count > 1) {
                        feedback = `${feedback} x${comboRef.current.count}`;
                    }
                } else {
                    comboRef.current.count = 1;
                }
                comboRef.current.lastScoreTime = now;
            } else {
                comboRef.current.count = 0;
            }
            
            playSwishSound();

            scoreRef.current += addedScore;
            basketsRef.current += 1;
            socket.emit("score:update", { score: scoreRef.current, baskets: basketsRef.current });

            // Behavior effects
            if (hoop.behavior === 'falling') {
               hoop.isFalling = true;
               hoop.fallVelocity = 2;
               feedbacksRef.current.push({
                 x: hoop.x, y: hoop.y + 40, text: "ROMPIMENTO!", color: "#f87171", size: 14, alpha: 1, vy: 1, id: Math.random()
               });
            } else if (hoop.behavior === 'destroyable') {
               hoop.isDestroyed = true;
               // Trigger explosion particles at hoop location
               for(let i=0; i<30; i++) {
                particlesRef.current.push({
                    x: hoop.x, y: hoop.y,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    color: hoop.type.color,
                    life: 1.0,
                    size: Math.random() * 8 + 4
                });
               }
            }
            
            // Add Feedback Text
            feedbacksRef.current.push({
                x: hoop.x,
                y: hoop.y - 50,
                text: feedback,
                color: feedbackColor,
                size: feedback === "PERFECT!" ? 40 : 25,
                alpha: 1.0,
                vy: -2,
                id: Math.random()
            });

            // Particles
            for(let i=0; i<15; i++) {
                particlesRef.current.push({
                    x: hoop.x + (Math.random() - 0.5) * hoop.size,
                    y: hoop.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    size: Math.random() * 4 + 2,
                    color: feedbackColor,
                    life: 1.0
                });
            }

            socket.emit("score:update", { score: scoreRef.current, baskets: basketsRef.current });
            if (hConfig.bounceOnPlayers) {
              player.vy *= -pConfig.hoopBounce;
              shakeRef.current += 5;
            }
            if (hConfig.dynamicSizing === 'expand-on-hit') {
              hoop.size *= 1.5;
            }
          }
        }

        // Update Net Simulation
        const netTiltAngle = (hoop.currentTilt * Math.PI / 180);
        hoop.net.update(hoop.x, hoop.y + hoop.vibrationOffset, hoop.displaySize, hoop.angle + netTiltAngle, {
            x: player.x,
            y: player.y,
            r: pConfig.hitboxSize,
            vx: player.vx,
            vy: player.vy
        });

        return hoop.y < height + 200;
      });

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Background (Static or centered on viewport)
      const skyGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
      skyGrad.addColorStop(0, "#0f172a");
      skyGrad.addColorStop(1, "#05050a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply Camera
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      if (shakeRef.current > 0.5) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      }

      // World Grid (Optional, helps with scale perception)
      if (hConfig.worldWidth > width * 2) {
          ctx.strokeStyle = "rgba(255,255,255,0.03)";
          ctx.lineWidth = 1;
          for(let x=0; x<hConfig.worldWidth; x+=500) {
              ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hConfig.worldHeight); ctx.stroke();
          }
          for(let y=0; y<hConfig.worldHeight; y+=500) {
              ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(hConfig.worldWidth, y); ctx.stroke();
          }
      }

      // Draw Basketball Court Floor
      const groundLevel = hConfig.worldHeight - 50;
      ctx.save();
      // Wood Texture Base (Vibrant basketball court amber)
      ctx.fillStyle = "#f59e0b"; // amber-500
      ctx.fillRect(0, groundLevel, hConfig.worldWidth, 1000);
      
      // Detailed Wood Grain Pattern
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      for(let i=0; i<hConfig.worldWidth; i+=30) {
          ctx.beginPath();
          ctx.moveTo(i, groundLevel);
          ctx.lineTo(i, hConfig.worldHeight + 500);
          ctx.stroke();
          
          // Random wood knots/grain variations
          if (i % 90 === 0) {
            ctx.fillStyle = "rgba(0,0,0,0.03)";
            ctx.beginPath();
            ctx.ellipse(i + 15, groundLevel + 100, 5, 20, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
          }
      }
      
      // Polished Finish Glow
      const floorGlow = ctx.createLinearGradient(0, groundLevel, 0, groundLevel + 200);
      floorGlow.addColorStop(0, "rgba(255,255,255,0.15)");
      floorGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = floorGlow;
      ctx.fillRect(0, groundLevel, hConfig.worldWidth, 200);

      // Professional Court Markings
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 8;
      // Main baseline
      ctx.beginPath(); ctx.moveTo(0, groundLevel); ctx.lineTo(hConfig.worldWidth, groundLevel); ctx.stroke();
      
      // Repeating Court Sections
      const courtWidth = 2000;
      for(let x=courtWidth/2; x < hConfig.worldWidth; x += courtWidth) {
          // Inner Paint (Key area)
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          // We are seeing the court from the "side", so the key is like a flat area on the ground
          ctx.fillRect(x - 300, groundLevel, 600, 10); // Subtle depth line
          
          // Outer arcs
          ctx.beginPath();
          ctx.arc(x, groundLevel, 400, 0, Math.PI, true);
          ctx.stroke();
          
          // Centers
          ctx.beginPath();
          ctx.arc(x, groundLevel, 50, 0, Math.PI, true);
          ctx.stroke();
      }
      ctx.restore();

      // Render Trajectory Guideline
      const s = shootStateRef.current;
      if (pConfig.gameplayMode !== 'jump' && s.isCharging && pConfig.showTrajectoryLine) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(251, 146, 60, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let tx = player.x;
        let ty = player.y;
        let tvx = Math.cos(s.angle) * (s.power);
        let tvy = Math.sin(s.angle) * (s.power);
        
        ctx.moveTo(tx, ty);
        for (let i = 0; i < 30; i++) {
          tvy += pConfig.gravity * pConfig.ballWeight;
          tvy *= pConfig.airResistance;
          tvx *= pConfig.airResistance;
          tx += tvx;
          ty += tvy;
          ctx.lineTo(tx, ty);
          if (ty > height) break;
        }
        ctx.stroke();
        ctx.restore();
      }

      if (pConfig.trailEnabled) {
        trailRef.current.forEach((point, i) => {
          ctx.save();
          ctx.globalAlpha = point.alpha * 0.3;
          const size = pConfig.hitboxSize * (1 - i / trailRef.current.length);
          
          if (ballConfig.trailType === 'fire') {
            ctx.fillStyle = i % 2 === 0 ? "#ff4500" : "#fbbf24";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ff4500";
          } else if (ballConfig.trailType === 'neon') {
            ctx.fillStyle = ballConfig.glowColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ballConfig.glowColor;
          } else if (ballConfig.trailType === 'smoke') {
            ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
          } else {
            ctx.fillStyle = ballConfig.primaryColor + "55";
          }
          
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Update and Render Feedbacks
      feedbacksRef.current = feedbacksRef.current.filter(f => {
        f.y += f.vy;
        f.alpha -= 0.015;
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.font = `bold ${f.size}px italic sans-serif`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = f.color;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
        return f.alpha > 0;
      });

      // Update and Render Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= 0.02;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return p.life > 0;
      });

      // Render HUD Indicators for Shooting
      if (pConfig.gameplayMode !== 'jump') {
         if (s.isCharging) {
            s.power = Math.min(s.power + pConfig.chargeSpeed, pConfig.maxShootPower);
            
            // Power Bar
            ctx.save();
            const barW = 100;
            const barH = 10;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(player.x - barW/2, player.y + 40, barW, barH);
            ctx.fillStyle = "#fb923c";
            ctx.fillRect(player.x - barW/2, player.y + 40, barW * (s.power / pConfig.maxShootPower), barH);
            ctx.restore();

            // Angle Text
            ctx.save();
            ctx.fillStyle = "white";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            const deg = Math.round((s.angle * 180) / Math.PI);
            ctx.fillText(`${Math.abs(deg)}°`, player.x, player.y + 65);
            ctx.restore();
         }
      }

      // Burnout HUD
      if (player.isBurnoutCharging) {
          ctx.save();
          // Circular progress around player
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 10;
          ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = player.burnoutPower > 25 ? "#ff4500" : "#fb923c";
          ctx.lineWidth = 12;
          const progress = player.burnoutPower / 30;
          ctx.arc(player.x, player.y, 40, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "white";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("BURNOUT", player.x, player.y + 60);
          ctx.restore();
      }

      // PHASE 0: Custom Room Objects
      roomObjectsRef.current.forEach(obj => {
        if (obj.isDestroyed) return;
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.angle * Math.PI / 180);
        
        ctx.fillStyle = obj.config?.color || "rgba(255,255,255,0.1)";
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;

        if (obj.type === 'spike_trap') {
          // Draw spikes
          ctx.fillStyle = "#ff4444";
          const spikeW = obj.width / 5;
          for(let i=0; i<5; i++) {
            ctx.beginPath();
            ctx.moveTo(-obj.width/2 + i*spikeW, obj.height/2);
            ctx.lineTo(-obj.width/2 + (i+0.5)*spikeW, -obj.height/2);
            ctx.lineTo(-obj.width/2 + (i+1)*spikeW, obj.height/2);
            ctx.fill();
          }
        } else if (obj.type === 'ramp') {
          // Draw Triangle Ramp
          ctx.beginPath();
          ctx.moveTo(-obj.width/2, obj.height/2);
          ctx.lineTo(obj.width/2, obj.height/2);
          ctx.lineTo(obj.width/2, -obj.height/2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Glow or arrow for speed
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(">>> BOOSTER >>>", 0, obj.height/4);
        } else if (obj.type === 'prop') {
          const type = obj.config?.type;
          ctx.save();
          if (type === 'water_bottle') {
            ctx.fillStyle = obj.config.color;
            ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
            ctx.fillStyle = "white";
            ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height * 0.2);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fillRect(-obj.width/4, -obj.height/2, obj.width/8, obj.height);
          } else if (type === 'trophy') {
            ctx.fillStyle = obj.config.color;
            ctx.beginPath();
            ctx.moveTo(-obj.width/2, -obj.height/2);
            ctx.lineTo(obj.width/2, -obj.height/2);
            ctx.lineTo(obj.width/4, obj.height/2);
            ctx.lineTo(-obj.width/4, obj.height/2);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(-obj.width/4, obj.height/2 - 5, obj.width/2, 10);
            // Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = obj.config.color;
            ctx.stroke();
          } else if (type === 'bench') {
            ctx.fillStyle = obj.config.color;
            ctx.fillRect(-obj.width/2, -10, obj.width, 20);
            ctx.fillRect(-obj.width/2 + 10, 10, 10, obj.height/2 - 10);
            ctx.fillRect(obj.width/2 - 20, 10, 10, obj.height/2 - 10);
          } else if (type === 'basketball_rack') {
            ctx.strokeStyle = obj.config.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
            ctx.beginPath();
            ctx.arc(0, -obj.height/4, 20, 0, Math.PI * 2);
            ctx.arc(0, obj.height/4, 20, 0, Math.PI * 2);
            ctx.stroke();
          } else if (type === 'cone') {
            ctx.fillStyle = obj.config.color;
            ctx.beginPath();
            ctx.moveTo(0, -obj.height/2);
            ctx.lineTo(-obj.width/2, obj.height/2);
            ctx.lineTo(obj.width/2, obj.height/2);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(-obj.width/2 - 5, obj.height/2 - 5, obj.width+10, 5);
          }
          ctx.restore();
        } else {
          // Box platforms / Elevators
          ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
          ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
          if (obj.type === 'elevator') {
            ctx.fillStyle = "white";
            ctx.fillRect(-obj.width/2 + 5, -obj.height/2 + 5, 2, obj.height - 10);
            ctx.fillRect(obj.width/2 - 7, -obj.height/2 + 5, 2, obj.height - 10);
          }
        }
        ctx.restore();
      });

      // PHASE 1: Draw Back Layer of Hoops
      hoopsRef.current.forEach(hoop => {
        ctx.save();
        ctx.translate(hoop.x, hoop.y + hoop.vibrationOffset);
        ctx.rotate(hoop.angle + (hoop.currentTilt * Math.PI / 180));
        
        // 1.1 Render Platform (Backpart)
        if (hoop.hasPlatform && hoop.platform) {
          const plat = hoop.platform;
          const platY = hoop.displaySize / 2 + 10;
          if (plat.hasSupportColumn) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 4;
            ctx.moveTo(0, platY);
            ctx.lineTo(0, -hoop.y - 100);
            ctx.stroke();
          }
        }

        // 1.2 Backboard (Always Back)
        if (hConfig.backboardEnabled) {
          ctx.save();
          if (!hConfig.backboardRotateWithHoop) ctx.rotate(-hoop.angle);
          ctx.translate(0, -hoop.displaySize / 2);
          const bbColor = hConfig.backboardTransparent ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)";
          ctx.fillStyle = bbColor;
          ctx.strokeStyle = hoop.type.color;
          ctx.lineWidth = 2;
          ctx.fillRect(-hConfig.backboardWidth/2, -hConfig.backboardHeight, hConfig.backboardWidth, hConfig.backboardHeight);
          ctx.strokeRect(-hConfig.backboardWidth/2, -hConfig.backboardHeight, hConfig.backboardWidth, hConfig.backboardHeight);
          ctx.strokeRect(-20, -40, 40, 30);
          ctx.restore();
        }

        // 1.3 Back-part of Rim Ellipse
        ctx.lineWidth = hConfig.borderWidth;
        const rimColor = hoop.scored ? "#4ade80" : hoop.type.color;
        ctx.strokeStyle = rimColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = rimColor;
        ctx.beginPath();
        // Draw the back half of the ellipse (upper half in visual space)
        ctx.ellipse(0, 0, hoop.displaySize / 2, hoop.displaySize / 5, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // PHASE 2: Draw Players (Middle Layer)
      Object.values(playersRef.current).forEach((p: Player) => {
        if (p.id === myId) return;
        const zScale = 1 + (p.z || 0) * 0.005;
        const otherAir = (p as any).airLevel || 1.0;
        const otherHp = (p as any).hp || 100;
        const otherMaxHp = (p as any).maxHp || 100;

        if (p.ballConfig) {
          drawBall(ctx, p.x, p.y, pConfig.hitboxSize * zScale, player.rotation, p.ballConfig.scale * zScale, { ...p.ballConfig, airLevel: otherAir });
          drawStats(ctx, p.x, p.y, otherHp, otherMaxHp, otherAir);
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, pConfig.hitboxSize * zScale, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.name ? p.name.toUpperCase() : "PILOT", p.x, p.y - 45);
      });

      // Local Player
      ctx.save();
      const zScaleLocal = 1 + (player.z) * 0.005;
      drawBall(ctx, player.x, player.y, pConfig.hitboxSize * zScaleLocal, player.rotation, ballConfig.scale * zScaleLocal, { ...ballConfig, airLevel: player.airLevel });
      drawStats(ctx, player.x, player.y, player.hp, player.maxHp, player.airLevel);
      ctx.restore();

      // PHASE 3: Draw Front Layer of Hoops (Net and Front Rim)
      hoopsRef.current.forEach(hoop => {
        // 3.1 Draw Net (Top of world space logic)
        // Some part of the net is technically behind but drawing it here makes it look like it encloses the ball
        hoop.net.draw(ctx);

        ctx.save();
        ctx.translate(hoop.x, hoop.y + hoop.vibrationOffset);
        ctx.rotate(hoop.angle + (hoop.currentTilt * Math.PI / 180));
        
        // 3.2 Platform (Frontpart)
        if (hoop.hasPlatform && hoop.platform) {
          ctx.save();
          const plat = hoop.platform;
          const platY = hoop.displaySize / 2 + 10;
          if (plat.material === 'neon') {
            ctx.fillStyle = plat.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = plat.color;
          } else if (plat.material === 'ice') {
            ctx.fillStyle = "rgba(186, 230, 253, 0.6)";
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 1;
          } else if (plat.material === 'glass') {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 2;
          } else if (plat.material === 'stone') {
            ctx.fillStyle = "#444";
            ctx.strokeStyle = "#222";
            ctx.lineWidth = 4;
          } else {
            ctx.fillStyle = plat.color;
          }
          ctx.roundRect(-plat.width/2, platY, plat.width, plat.height, 5);
          ctx.fill();
          if (plat.material === 'stone' || plat.material === 'ice' || plat.material === 'glass') ctx.stroke();
          ctx.restore();
        }

        // 3.3 Front-part of Rim Ellipse
        ctx.lineWidth = hConfig.borderWidth;
        const rimColor = hoop.scored ? "#4ade80" : hoop.type.color;
        ctx.strokeStyle = rimColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = rimColor;
        ctx.beginPath();
        // Draw the front half of the ellipse (lower half in visual space)
        ctx.ellipse(0, 0, hoop.displaySize / 2, hoop.displaySize / 5, 0, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      });

      ctx.restore(); // Exit camera transform

      // --- UI OVERLAY ---
      
      // Placar de Cestas
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.font = "black 120px italic";
      ctx.textAlign = "center";
      ctx.fillText(basketsRef.current.toString().padStart(2, "0"), width / 2, 120);
      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("BASKETS", width / 2, 150);
      
      // Personal Score
      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`SCORE: ${Math.round(scoreRef.current)}`, 40, 60);
      ctx.restore();

      // MiniMap
      ctx.save();
      const mmW = 200;
      const mmH = (hConfig.worldHeight / hConfig.worldWidth) * mmW;
      const mmX = width - mmW - 40;
      const mmY = 40;
      
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mmX, mmY, mmW, mmH, 10);
      ctx.fill();
      ctx.stroke();
      
      // Viewport Rect in Minimap
      const camX = (cameraRef.current.x / hConfig.worldWidth) * mmW;
      const camY = (cameraRef.current.y / hConfig.worldHeight) * mmH;
      const camW = (width / hConfig.worldWidth) * mmW;
      const camH = (height / hConfig.worldHeight) * mmH;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.strokeRect(mmX + camX, mmY + camY, camW, camH);

      // Hoops in Minimap
      hoopsRef.current.forEach(h => {
          const hX = (h.x / hConfig.worldWidth) * mmW;
          const hY = (h.y / hConfig.worldHeight) * mmH;
          ctx.fillStyle = h.type.color;
          ctx.beginPath();
          ctx.arc(mmX + hX, mmY + hY, 2, 0, Math.PI * 2);
          ctx.fill();
      });

      // Custom Objects in Minimap
      roomObjectsRef.current.forEach(obj => {
          if (obj.isDestroyed) return;
          const oX = (obj.x / hConfig.worldWidth) * mmW;
          const oY = (obj.y / hConfig.worldHeight) * mmH;
          ctx.fillStyle = obj.type === 'spike_trap' ? '#ff4444' : 'rgba(255,255,255,0.4)';
          ctx.fillRect(mmX + oX - 2, mmY + oY - 1, 4, 2);
      });

      // Players in Minimap
      (Object.values(players) as Player[]).forEach(p => {
          const pX = (p.x / hConfig.worldWidth) * mmW;
          const pY = (p.y / hConfig.worldHeight) * mmH;
          ctx.fillStyle = p.id === myId ? "#fff" : (p.color || "red");
          ctx.beginPath();
          ctx.arc(mmX + pX, mmY + pY, p.id === myId ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.restore();

      // Leaderboard
      ctx.save();
      
      // Timer
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.roundRect(width / 2 - 60, 20, 120, 40, 10);
      ctx.fill();
      ctx.fillStyle = timeRemaining < 30 ? "#f87171" : "#ffffff";
      ctx.font = "bold 20px Inter";
      ctx.textAlign = "center";
      ctx.fillText(formatTime(timeRemaining), width / 2, 47);

      const lbX = 40;
      const lbY = 100;
      ctx.fillStyle = "white";
      ctx.font = "bold 12px monospace";
      ctx.fillText("RANKING", lbX, lbY);
      
      const sortedPlayers = (Object.values(players) as Player[]).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
      sortedPlayers.forEach((p, i) => {
          ctx.fillStyle = p.id === myId ? "#4ade80" : "rgba(255,255,255,0.6)";
          ctx.fillText(`${i+1}. ${p.name?.slice(0, 10)}: ${Math.round(p.score || 0)}`, lbX, lbY + 20 + i * 20);
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const pConfig = physicsRef.current;
        if (pConfig.gameplayMode !== 'throw') {
          const player = playerPosRef.current;
          const now = Date.now();
          if (player.jumpsAvailable > 0 && now - player.lastJumpTime > pConfig.jumpCooldown) {
            if (pConfig.cancelFallOnJump) player.vy = 0;
            const isFirstJump = player.jumpsAvailable === (pConfig.extraJumps + 1);
            player.vy += isFirstJump ? pConfig.jumpForce : pConfig.secondJumpForce;
            player.jumpsAvailable--;
            player.lastJumpTime = now;
            if (player.lastOnBackboardHoopId !== null) {
                player.backboardJumpCount++;
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    handleResize();
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      socket.off("hoop:spawned", handleSpawn);
    };
  }, [socket, myId]); // players removed from dependency array

  // Input Handling
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pConfig = physicsRef.current;
    
    // Check for right click (button 2)
    const isRightClick = 'button' in e && e.button === 2;
    
    if (isRightClick) {
        playerPosRef.current.isBurnoutCharging = true;
        playerPosRef.current.burnoutPower = 0;
        return;
    }

    if (pConfig.gameplayMode === 'jump') {
        const player = playerPosRef.current;
        const now = Date.now();
        if (player.jumpsAvailable > 0 && now - player.lastJumpTime > pConfig.jumpCooldown) {
          if (pConfig.cancelFallOnJump) player.vy = 0;
          const isFirstJump = player.jumpsAvailable === (pConfig.extraJumps + 1);
          player.vy += isFirstJump ? pConfig.jumpForce : pConfig.secondJumpForce;
          player.vz = (Math.random() - 0.5) * 4; // Add depth variation on jump
          player.jumpsAvailable--;
          player.lastJumpTime = now;
          if (player.lastOnBackboardHoopId !== null) {
              player.backboardJumpCount++;
          }
          if (pConfig.squashStretchEnabled) {
              player.squash = 0.4;
              player.stretch = 1.8;
          }
        }
    } else {
        // Shooting Mode (Mode 2 or Mixed)
        shootStateRef.current.isCharging = true;
        shootStateRef.current.power = 0;
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    const pConfig = physicsRef.current;
    const s = shootStateRef.current;
    const player = playerPosRef.current;

    // Handle Burnout Release
    if (player.isBurnoutCharging) {
        if (player.burnoutPower > 5) {
            player.vx = Math.cos(player.burnoutAngle) * player.burnoutPower * 1.5;
            player.vy = Math.sin(player.burnoutAngle) * player.burnoutPower * 1.5;
            
            // Visual Blast
            shakeRef.current += player.burnoutPower;
            for(let i=0; i<20; i++) {
                particlesRef.current.push({
                   x: player.x,
                   y: player.y,
                   vx: (Math.random() - 0.5) * 20,
                   vy: (Math.random() - 0.5) * 20,
                   size: Math.random() * 8 + 4,
                   color: "#ff8c00",
                   life: 0.8
                });
            }
        }
        player.isBurnoutCharging = false;
        player.burnoutPower = 0;
        return;
    }
    
    if (pConfig.gameplayMode !== 'jump' && s.isCharging) {
      const now = Date.now();
      
      if (now - s.lastShootTime > pConfig.throwCooldown) {
          player.vx = Math.cos(s.angle) * s.power;
          player.vy = Math.sin(s.angle) * s.power;
          player.vz = (Math.random() - 0.5) * 6; // Add depth variation on throw
          
          s.lastShootTime = now;
          s.isBallInAir = true;
          s.originX = player.x;
          s.originY = player.y;

          if (pConfig.squashStretchEnabled) {
            player.squash = 0.6;
            player.stretch = 1.4;
          }
      }
      
      s.isCharging = false;
      s.power = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const pConfig = physicsRef.current;
    
    // Update Position Tracking (and Wiggle Detection)
    const player = playerPosRef.current;
    if (Math.abs(mouseX - player.targetX) > 5) {
        const moveDir = Math.sign(mouseX - player.targetX);
        const now = Date.now();
        if (moveDir !== player.lastWiggleDir && now - player.lastWiggleTime < 300) {
            player.wiggleCount++;
            player.lastWiggleTime = now;
            player.lastWiggleDir = moveDir;
        } else if (now - player.lastWiggleTime > 500) {
            player.wiggleCount = 0;
        }
    }
    player.targetX = mouseX;

    // Update Aim Angle with optional sensitivity
    const dx = (mouseX - player.x) * pConfig.aimSensitivity;
    const dy = (mouseY - player.y) * pConfig.aimSensitivity;
    const angle = Math.atan2(dy, dx);

    if (player.isBurnoutCharging) {
        player.burnoutAngle = angle;
        player.burnoutPower = Math.min(player.burnoutPower + 0.3, 30);
    }

    shootStateRef.current.angle = angle;
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-crosshair touch-none overflow-hidden"
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      <canvas 
        ref={canvasRef} 
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block"
      />

      <AnimatePresence>
        {gameStatus === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0a14] border border-white/10 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl"
            >
              <Crown className="w-20 h-20 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Fim de Jogo</h2>
              <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-8 opacity-60">Resultados da Partida</p>
              
              <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/40 uppercase font-black text-[10px] tracking-widest">Score Final</span>
                  <span className="text-2xl font-black text-indigo-400">{Math.round(scoreRef.current)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 uppercase font-black text-[10px] tracking-widest">Cestas Totais</span>
                  <span className="text-2xl font-black text-white">{basketsRef.current}</span>
                </div>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-95"
              >
                Voltar ao Menu
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameStatus === 'eliminated' && !showAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                <X className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Eliminado</h2>
              <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-8 opacity-60">Sua bola explodiu!</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setShowAd(true)}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(234,179,8,0.3)] active:scale-95"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Assistir AD (Reviver)
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/40 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] active:scale-95 border border-white/5"
                >
                  Return to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[300] bg-indigo-900 overflow-hidden flex flex-col justify-center items-center text-center p-12"
          >
            <div className="absolute top-10 right-10 flex gap-4 items-center">
              {canSkipAd ? (
                <button 
                  onClick={handleRevive}
                  className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-white font-black uppercase text-xs tracking-widest transition-all"
                >
                  Pular Propaganda
                </button>
              ) : (
                <div className="bg-black/50 px-6 py-3 rounded-full text-white/60 font-black uppercase text-[10px] tracking-widest flex items-center gap-3">
                  Aguarde {adCountdown - 25}s
                </div>
              )}
            </div>

            <div className="relative z-10 space-y-8 max-w-2xl">
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
                <h3 className="text-6xl font-black text-white/20 uppercase tracking-tighter mb-8 leading-none">REWARDED AD</h3>
                <div className="font-mono text-white/40 text-xs mb-8 p-4 bg-black/40 rounded-2xl border border-white/5">
                  CA-APP-PUB-3940256099942544/5224354917
                </div>
                <p className="text-indigo-200/60 font-bold uppercase tracking-widest text-sm mb-12">
                  Assista este anúncio para manter seus pontos e retornar à batalha no céu.
                </p>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 30, ease: "linear" }}
                    className="h-full bg-indigo-500 shadow-[0_0_20px_#6366f1]"
                  />
                </div>
                <div className="mt-4 text-right text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.2em]">
                  {adCountdown} Segundos Restantes
                </div>
              </div>
            </div>

            {/* Simulated AD background elements */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               {[...Array(20)].map((_, i) => (
                 <motion.div 
                   key={i}
                   animate={{ 
                     y: [Math.random() * 1000, -200],
                     rotate: [0, 360],
                     opacity: [0, 1, 0]
                   }}
                   transition={{ 
                     duration: Math.random() * 5 + 5, 
                     repeat: Infinity, 
                     delay: Math.random() * 5 
                   }}
                   className="absolute bg-white/20 w-8 h-8 rounded-lg blur-sm"
                   style={{ left: `${Math.random() * 100}%` }}
                 />
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
