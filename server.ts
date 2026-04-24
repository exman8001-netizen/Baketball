import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Game state
  let players: Record<string, any> = {};
  let hoops: any[] = [];
  let hoopIdCounter = 0;
  
  // Use a complete default config to avoid missing properties on client
  let hoopConfig = { 
    maxHoops: 12,
    spawnInterval: 1800,
    globalFallSpeed: 3.5,
    spawnPattern: 'random',
    multiSpawnChance: 0.15,
    movementType: 'linear',
    rotationType: 'none',
    individualSpeeds: false,
    allowedAngles: [0],
    randomAngleRange: false,
    lockAngleByType: false,
    baseSize: 65,
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
    bounceOnPlayers: true,
    adaptiveDifficulty: false,
    speedIncreaseOverTime: 0,
    complexityIncreaseOverTime: 0,
    scoreRimHit: 1,
    scoreRimRoll: 5,
    scoreSwish: 15,
    scoreRimIn: 5,
    scoreEnterBottom: -10,
    worldWidth: 4000,
    worldHeight: 2500,
  };

  // Dedicated Room State
  const rooms: Record<string, any> = {
    "default": {
      id: "default",
      name: "Arena Estelar",
      creatorId: "system",
      worldWidth: 4000,
      worldHeight: 2500,
      maxPlayers: 20,
      matchTimeLimit: 600,
      objects: [
        { id: 'prop-1', type: 'prop', x: 800, y: 2450, z: 0, width: 40, height: 60, angle: 0, behavior: 'physics', config: { type: 'water_bottle', color: '#60a5fa' } },
        { id: 'prop-2', type: 'prop', x: 2000, y: 2450, z: 0, width: 60, height: 100, angle: 0, behavior: 'physics', config: { type: 'trophy', color: '#fbbf24' } },
        { id: 'prop-3', type: 'prop', x: 1200, y: 2450, z: 0, width: 200, height: 80, angle: 0, behavior: 'physics', config: { type: 'bench', color: '#4b5563' } },
        { id: 'prop-4', type: 'prop', x: 3200, y: 2450, z: 0, width: 120, height: 180, angle: 0, behavior: 'physics', config: { type: 'basketball_rack', color: '#92400e' } },
        { id: 'prop-5', type: 'prop', x: 1500, y: 2450, z: 0, width: 40, height: 60, angle: 0, behavior: 'physics', config: { type: 'cone', color: '#f97316' } },
        { id: 'prop-6', type: 'prop', x: 2500, y: 2450, z: 0, width: 40, height: 60, angle: 0, behavior: 'physics', config: { type: 'cone', color: '#f97316' } },
        { id: 'prop-7', type: 'prop', x: 500, y: 2450, z: 0, width: 40, height: 60, angle: 0, behavior: 'physics', config: { type: 'water_bottle', color: '#fb7185' } },
        { id: 'prop-8', type: 'prop', x: 1800, y: 2450, z: 0, width: 40, height: 60, angle: 0, behavior: 'physics', config: { type: 'cone', color: '#f97316' } },
        { id: 'prop-9', type: 'prop', x: 2200, y: 2450, z: 0, width: 200, height: 80, angle: 0, behavior: 'physics', config: { type: 'bench', color: '#4b5563' } },
        { id: 'prop-10', type: 'prop', x: 3500, y: 2450, z: 0, width: 60, height: 100, angle: 0, behavior: 'physics', config: { type: 'trophy', color: '#eab308' } },
      ],
      hoopConfig: { ...hoopConfig }
    }
  };

  const activeRooms: Record<string, { startTime: number; hoops: any[] }> = {
    "default": { startTime: Date.now(), hoops: [] }
  };

  // Server-side simulation loop
  setInterval(() => {
    const now = Date.now();
    
    Object.keys(activeRooms).forEach(roomId => {
        const roomState = activeRooms[roomId];
        const roomConfigObj = rooms[roomId];
        
        if (!roomState || !roomConfigObj) return;

        // 1. Update existing hoops in this room
        roomState.hoops = roomState.hoops.filter(hoop => {
            const elapsed = (now - hoop.createdAt) / 1000;
            hoop.y += hoop.speed;
            
            // Movement patterns
            if (hoop.movementType === 'zigzag') hoop.x += Math.sin(elapsed * 5) * 4;
            else if (hoop.movementType === 'wave') hoop.x += Math.cos(elapsed * 2) * 6;
            
            if (hoop.rotationSpeed !== 0) hoop.angle += hoop.rotationSpeed;
            
            // Boundary checks
            return hoop.y < (roomConfigObj.worldHeight || 8000);
        });

        // 2. Handle Auto-Spawning (only if room is default or has specific config)
        const playersInRoom = Object.values(players).filter(p => p.roomId === roomId);
        if (playersInRoom.length > 0 && roomId === "default" && roomState.hoops.length < hoopConfig.maxHoops) {
            // ... Spawning logic ...
            // Simplified for now, just spawning one if needed
            if (now % 2000 < 50) { // roughly every 2s
                const newHoop = createHoop(roomId);
                roomState.hoops.push(newHoop);
                io.to(roomId).emit("hoop:spawned", newHoop);
            }
        }
    });

  }, 50);

  const createHoop = (roomId: string) => {
    const room = rooms[roomId];
    return {
      id: hoopIdCounter++,
      x: Math.random() * (room.worldWidth - 200) + 100,
      y: -150,
      speed: hoopConfig.globalFallSpeed,
      size: hoopConfig.baseSize,
      displaySize: hoopConfig.baseSize,
      type: hoopConfig.hoopTypes[0],
      angle: 0,
      rotationSpeed: 0,
      movementType: 'linear',
      dynamicSizing: 'none',
      hasPlatform: false,
      createdAt: Date.now()
    };
  }

  const spawnHoop = () => {
    const random = Math.random();
    let cumulative = 0;
    let selectedType = hoopConfig.hoopTypes[0];
    
    for (const type of hoopConfig.hoopTypes) {
      cumulative += type.spawnChance;
      if (random <= cumulative) {
        selectedType = type;
        break;
      }
    }

    // Determine Angle
    let angle = 0;
    if (hoopConfig.allowedAngles && hoopConfig.allowedAngles.length > 0) {
      const idx = Math.floor(Math.random() * hoopConfig.allowedAngles.length);
      angle = hoopConfig.allowedAngles[idx];
      if (hoopConfig.randomAngleRange) {
        angle += (Math.random() - 0.5) * 15;
      }
    }

    // Rotation Speed
    let rotationSpeed = 0;
    const rotType = hoopConfig.rotationType === 'random' 
      ? ['none', 'slow', 'medium', 'fast'][Math.floor(Math.random() * 4)] 
      : hoopConfig.rotationType;
      
    if (rotType === 'slow') rotationSpeed = 0.02;
    else if (rotType === 'medium') rotationSpeed = 0.05;
    else if (rotType === 'fast') rotationSpeed = 0.1;

    // Platform logic
    const hasPlatform = hoopConfig.platform.enabled && Math.random() < hoopConfig.platform.spawnChance;
    
    const hoop = {
      id: hoopIdCounter++,
      x: Math.random() * (hoopConfig.worldWidth - 200) + 100,
      y: -150,
      speed: hoopConfig.globalFallSpeed * (hoopConfig.individualSpeeds ? (0.8 + Math.random() * 0.4) : 1),
      size: hoopConfig.baseSize,
      displaySize: hoopConfig.baseSize,
      type: selectedType,
      angle: angle,
      rotationSpeed: rotationSpeed,
      movementType: hoopConfig.movementType,
      dynamicSizing: hoopConfig.dynamicSizing,
      hasPlatform: hasPlatform,
      platform: hasPlatform ? { ...hoopConfig.platform } : null,
      createdAt: Date.now()
    };
    hoops.push(hoop);
    io.emit("hoop:spawned", hoop);
  };

  let spawnTimer: NodeJS.Timeout | null = null;
  const startSpawning = () => {
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
      // Only spawn if players are active and we haven't hit the limit
      if (Object.keys(players).length > 0 && hoops.length < hoopConfig.maxHoops) {
        spawnHoop();
        
        if (Math.random() < hoopConfig.multiSpawnChance) {
          setTimeout(spawnHoop, 300);
        }
      }
    }, hoopConfig.spawnInterval);
  };

  startSpawning();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Initial state (minimal until setup)
    players[socket.id] = {
      id: socket.id,
      x: (hoopConfig.worldWidth || 4000) / 2,
      y: (hoopConfig.worldHeight || 2500) / 2,
      z: 0,
      score: 0,
      baskets: 0,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      name: `Player ${socket.id.slice(0, 4)}`,
      ballConfig: null // Will be set on setup
    };

    socket.emit("init", {
      id: socket.id,
      players,
      hoops: activeRooms["default"].hoops,
      hoopConfig,
      rooms: Object.values(rooms)
    });

    socket.broadcast.emit("player:joined", players[socket.id]);

    socket.on("hoop:config:update", (newConfig) => {
      hoopConfig = { ...hoopConfig, ...newConfig };
      io.emit("hoop:config:updated", hoopConfig);
    });

    socket.on("player:setup", (data) => {
      if (players[socket.id]) {
        players[socket.id].name = data.name;
        players[socket.id].ballConfig = data.ballConfig;
        players[socket.id].roomId = data.roomId || "default";
        
        const roomId = players[socket.id].roomId;
        socket.join(roomId);

        // Send room data to the connecting player
        const room = rooms[roomId] || rooms["default"];
        socket.emit("room:data", room);

        io.to(roomId).emit("player:joined", players[socket.id]);
      }
    });

    socket.on("room:save", (config) => {
      rooms[config.id] = config;
      if (!activeRooms[config.id]) {
        activeRooms[config.id] = { startTime: Date.now(), hoops: [] };
      }
      io.emit("room:list", Object.values(rooms));
    });

    socket.on("room:request:list", () => {
      socket.emit("room:list", Object.values(rooms));
    });

    socket.on("player:ball:update", (config) => {
      if (players[socket.id]) {
        const p = players[socket.id];
        p.ballConfig = config;
        io.to(p.roomId).emit("player:ball:updated", {
          id: socket.id,
          ballConfig: config
        });
      }
    });

    socket.on("player:move", (data) => {
      if (players[socket.id]) {
        const p = players[socket.id];
        p.x = data.x;
        p.y = data.y;
        p.z = data.z || 0;
        
        // Update battle stats
        (p as any).hp = data.hp;
        (p as any).airLevel = data.airLevel;
        (p as any).energy = data.energy;

        socket.to(p.roomId).emit("player:moved", {
          id: socket.id,
          x: data.x,
          y: data.y,
          z: data.z || 0,
          hp: data.hp,
          airLevel: data.airLevel,
          energy: data.energy
        });
      }
    });

    socket.on("score:update", (data) => {
      if (players[socket.id]) {
        const p = players[socket.id];
        p.score = data.score;
        io.to(p.roomId).emit("score:updated", {
          id: socket.id,
          score: data.score
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const p = players[socket.id];
      if (p) {
        io.to(p.roomId).emit("player:left", socket.id);
      }
      delete players[socket.id];
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
