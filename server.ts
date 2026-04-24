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

  const generateRandomObjects = (width: number, height: number) => {
    const objects: any[] = [
        { id: 'fh-left', type: 'fixed_hoop', x: 200, y: height - 600, z: 0, width: 200, height: 600, angle: 0, behavior: 'static', config: { side: 'left', hasBackboard: true, hasColumn: true, color: '#ffffff', scoreValue: 5 } },
        { id: 'fh-right', type: 'fixed_hoop', x: width - 200, y: height - 600, z: 0, width: 200, height: 600, angle: 0, behavior: 'static', config: { side: 'right', hasBackboard: true, hasColumn: true, color: '#ffffff', scoreValue: 5 } },
    ];

    const propTypes = ['car', 'pole', 'glass_table', 'trophy', 'statue', 'bench', 'cone', 'crate', 'barrel'];
    const propCount = 10 + Math.floor(Math.random() * 15);

    for (let i = 0; i < propCount; i++) {
        const type = propTypes[Math.floor(Math.random() * propTypes.length)];
        let w = 80, h = 80;
        if (type === 'car') { w = 200; h = 100; }
        if (type === 'pole') { w = 40; h = 600; }
        if (type === 'glass_table') { w = 250; h = 100; }
        if (type === 'statue') { w = 120; h = 250; }
        if (type === 'bench') { w = 150; h = 60; }

        objects.push({
            id: `random-prop-${i}`,
            type: 'prop',
            x: 500 + Math.random() * (width - 1000),
            y: height - h/2 - (Math.random() * 50), // Mostly on ground
            z: 0,
            width: w,
            height: h,
            angle: 0,
            behavior: (Math.random() > 0.5) ? 'physics' : 'static',
            config: { 
                type, 
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                isBreakable: Math.random() > 0.7
            }
        });
    }

    // Add some random platforms
    for (let i = 0; i < 5; i++) {
        objects.push({
            id: `random-platform-${i}`,
            type: 'platform',
            x: 500 + Math.random() * (width - 1000),
            y: 500 + Math.random() * (height - 1500),
            z: 0,
            width: 200 + Math.random() * 400,
            height: 40,
            angle: 0,
            behavior: 'static',
            config: { color: '#6366f1' }
        });
    }

    return objects;
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
      floorColor: "#1e1b4b",
      backgroundType: "space",
      objects: generateRandomObjects(4000, 2500),
      hoopConfig: { ...hoopConfig }
    },
    "street": {
      id: "street",
      name: "Quadra da Rua",
      creatorId: "system",
      worldWidth: 3000,
      worldHeight: 1800,
      maxPlayers: 10,
      matchTimeLimit: 300,
      floorColor: "#334155",
      backgroundType: "street",
      objects: [
        { id: 'fh-l', type: 'fixed_hoop', x: 100, y: 1300, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'left', hasBackboard: true, hasColumn: true, color: '#fb923c', scoreValue: 10 } },
        { id: 'fh-r', type: 'fixed_hoop', x: 2900, y: 1300, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'right', hasBackboard: true, hasColumn: true, color: '#fb923c', scoreValue: 10 } },
        { id: 'glass-1', type: 'prop', x: 1500, y: 1750, z: 0, width: 250, height: 80, angle: 0, behavior: 'destroyable', config: { type: 'glass_table', color: '#bae6fd', isBreakable: true } },
      ],
      hoopConfig: { ...hoopConfig, speed: 5, spawnInterval: 1500 }
    },
    "gym": {
      id: "gym",
      name: "Ginásio Elite",
      creatorId: "system",
      worldWidth: 4000,
      worldHeight: 2200,
      maxPlayers: 12,
      matchTimeLimit: 600,
      floorColor: "#92400e",
      backgroundType: "gym",
      objects: [
        { id: 'fh-l', type: 'fixed_hoop', x: 150, y: 1700, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'left', hasBackboard: true, hasColumn: true, color: '#ef4444', scoreValue: 5 } },
        { id: 'fh-r', type: 'fixed_hoop', x: 3850, y: 1700, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'right', hasBackboard: true, hasColumn: true, color: '#ef4444', scoreValue: 5 } },
      ],
      hoopConfig: { ...hoopConfig, speed: 4, gravity: 0.1 }
    },
    "city": {
      id: "city",
      name: "Centro de Destruição",
      creatorId: "system",
      worldWidth: 6000,
      worldHeight: 2500,
      maxPlayers: 20,
      matchTimeLimit: 900,
      floorColor: "#1e293b",
      backgroundType: "urban",
      objects: [
        // PROGRAMMATICALLY SPREADING OBJECTS
        ...Array.from({ length: 15 }).map((_, i) => ({ 
          id: `car-${i}`, type: 'prop' as const, x: 500 + i * 400, y: 2450, z: 0, width: 180, height: 80, angle: 0, behavior: 'physics' as const, 
          config: { type: 'car', color: i % 2 === 0 ? '#ef4444' : '#3b82f6', isBreakable: true } 
        })),
        ...Array.from({ length: 10 }).map((_, i) => ({ 
          id: `pole-${i}`, type: 'prop' as const, x: 300 + i * 600, y: 2200, z: 0, width: 40, height: 600, angle: 0, behavior: 'destroyable' as const, 
          config: { type: 'pole', color: '#475569', isBreakable: true } 
        })),
        ...Array.from({ length: 30 }).map((_, i) => ({ 
          id: `crate-${i}`, type: 'prop' as const, x: 700 + i * 180, y: 2400 - (i % 3) * 100, z: 0, width: 80, height: 80, angle: 0, behavior: 'physics' as const, 
          config: { type: 'crate', color: '#92400e', isBreakable: true } 
        })),
        ...Array.from({ length: 20 }).map((_, i) => ({ 
          id: `barrel-${i}`, type: 'prop' as const, x: 1000 + i * 250, y: 2450, z: 0, width: 60, height: 100, angle: 0, behavior: 'physics' as const, 
          config: { type: 'barrel', color: '#ef4444', isBreakable: true } 
        })),
        ...Array.from({ length: 10 }).map((_, i) => ({ 
          id: `glass-${i}`, type: 'prop' as const, x: 1200 + i * 500, y: 1500, z: 0, width: 300, height: 50, angle: 0, behavior: 'destroyable' as const, 
          config: { type: 'glass_table', color: '#93c5fd', isBreakable: true } 
        })),
        ...Array.from({ length: 15 }).map((_, i) => ({ 
          id: `trophy-${i}`, type: 'prop' as const, x: 200 + i * 380, y: 2450, z: 0, width: 50, height: 80, angle: 0, behavior: 'physics' as const, 
          config: { type: 'trophy', color: '#fbbf24', isBreakable: true } 
        })),
        { id: 'fh-l', type: 'fixed_hoop', x: 200, y: 2000, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'left', hasBackboard: true, hasColumn: true, color: '#ef4444', scoreValue: 10 } },
        { id: 'fh-r', type: 'fixed_hoop', x: 5800, y: 2000, z: 0, width: 200, height: 500, angle: 0, behavior: 'static', config: { side: 'right', hasBackboard: true, hasColumn: true, color: '#ef4444', scoreValue: 10 } },
      ],
      hoopConfig: { ...hoopConfig, speed: 6 }
    },
    "warehouse": {
      id: "warehouse",
      name: "Armazém Abandonado",
      creatorId: "system",
      worldWidth: 5000,
      worldHeight: 3000,
      maxPlayers: 15,
      matchTimeLimit: 600,
      floorColor: "#334155",
      backgroundType: "urban",
      hasWall: true,
      hasCeiling: true,
      wallWidth: 150,
      ceilingHeight: 150,
      enableEvolution: true,
      windows: [
        { x: 1000, y: 1000, width: 500, height: 400 },
        { x: 4000, y: 1000, width: 500, height: 400 },
        { x: 2500, y: 200, width: 800, height: 300 }, // Ceiling window
      ],
      objects: [
        { id: 'crates-stack', type: 'prop', x: 2500, y: 2900, z: 0, width: 400, height: 200, angle: 0, behavior: 'physics', config: { type: 'crate', color: '#78350f' } },
        { id: 'warehouse-hoop', type: 'fixed_hoop', x: 2500, y: 1500, z: 0, width: 120, height: 400, angle: 0, behavior: 'static', config: { hasBackboard: true, color: '#ffffff' } },
      ],
      hoopConfig: { ...hoopConfig, maxHoops: 15 }
    }
  };

  const activeRooms: Record<string, { startTime: number; hoops: any[] }> = {
    "default": { startTime: Date.now(), hoops: [] },
    "street": { startTime: Date.now(), hoops: [] },
    "gym": { startTime: Date.now(), hoops: [] },
    "city": { startTime: Date.now(), hoops: [] },
    "warehouse": { startTime: Date.now(), hoops: [] }
  };

  // Server-side simulation loop
  setInterval(() => {
    const now = Date.now();
    
    Object.keys(activeRooms).forEach(roomId => {
        const roomState = activeRooms[roomId];
        const roomConfigObj = rooms[roomId];
        
        if (!roomState || !roomConfigObj) return;

        const hConfig = roomConfigObj.hoopConfig || hoopConfig;

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

        // 2. Handle Auto-Spawning
        const playersInRoom = Object.values(players).filter(p => p.roomId === roomId);
        if (playersInRoom.length > 0 && roomState.hoops.length < hConfig.maxHoops) {
            if (now % hConfig.spawnInterval < 50) { 
                const newHoop = createHoop(roomId);
                roomState.hoops.push(newHoop);
                io.to(roomId).emit("hoop:spawned", newHoop);
            }
        }
    });

  }, 50);

  const createHoop = (roomId: string) => {
    const room = rooms[roomId];
    const hConf = room.hoopConfig || hoopConfig;
    
    const random = Math.random();
    let cumulative = 0;
    let selectedType = hConf.hoopTypes[0];
    
    for (const type of hConf.hoopTypes) {
      cumulative += type.spawnChance;
      if (random <= cumulative) {
        selectedType = type;
        break;
      }
    }

    return {
      id: hoopIdCounter++,
      x: Math.random() * (room.worldWidth - 400) + 200,
      y: -150,
      speed: hConf.globalFallSpeed * (0.8 + Math.random() * 0.4),
      size: hConf.baseSize,
      displaySize: hConf.baseSize,
      type: selectedType,
      angle: 0,
      rotationSpeed: 0,
      movementType: hConf.movementType,
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
      kills: 0,
      deaths: 0,
      level: 1,
      airXp: 0,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      name: `Player ${socket.id.slice(0, 4)}`,
      ballConfig: null, // Will be set on setup
      stats: {
        totalKills: 0,
        totalDeaths: 0,
        totalBaskets: 0,
        totalScore: 0,
        matchesWon: 0,
        matchesPlayed: 0,
        playtimeHours: 0,
        likes: 0,
        bio: "Determinado a alcançar o topo!",
        favoriteTeam: "Céu Estelar FC",
        favoritePlayer: "A lenda do Salto"
      }
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
        p.baskets = data.baskets || p.baskets;
        p.level = data.level || p.level;
        p.airXp = data.airXp || p.airXp;
        io.to(p.roomId).emit("score:updated", {
          id: socket.id,
          score: data.score,
          baskets: p.baskets,
          level: p.level,
          airXp: p.airXp
        });
      }
    });

    socket.on("player:kill", (data) => {
       const victimId = data.victimId;
       const attackerId = socket.id;
       if (players[attackerId] && players[victimId]) {
           players[attackerId].kills += 1;
           players[attackerId].stats.totalKills += 1;
           players[victimId].deaths += 1;
           players[victimId].stats.totalDeaths += 1;
           
           io.to(players[attackerId].roomId).emit("stats:updated", {
              id: attackerId,
              kills: players[attackerId].kills,
              deaths: players[attackerId].deaths
           });
           io.to(players[victimId].roomId).emit("stats:updated", {
              id: victimId,
              kills: players[victimId].kills,
              deaths: players[victimId].deaths
           });
           
           io.to(players[attackerId].roomId).emit("feed:kill", {
              attacker: players[attackerId].name,
              victim: players[victimId].name
           });
       }
    });

    socket.on("profile:update", (data) => {
       if (players[socket.id]) {
           players[socket.id].stats = { ...players[socket.id].stats, ...data };
           io.to(players[socket.id].roomId).emit("player:profile:updated", {
              id: socket.id,
              stats: players[socket.id].stats
           });
       }
    });

    socket.on("profile:like", (data) => {
        const targetId = data.targetId;
        if (players[targetId]) {
            players[targetId].stats.likes += 1;
            io.to(players[targetId].roomId).emit("player:profile:updated", {
               id: targetId,
               stats: players[targetId].stats
            });
        }
    });

    socket.on("object:destroy", (data) => {
      const { roomId, objectId } = data;
      if (rooms[roomId]) {
        const obj = rooms[roomId].objects.find((o: any) => o.id === objectId);
        if (obj) {
          obj.isDestroyed = true;
          io.to(roomId).emit("object:destroyed", { objectId });
        }
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
