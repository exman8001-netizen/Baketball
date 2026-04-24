import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GameCanvas } from "./components/GameCanvas";
import { Trophy, Users, Zap, LayoutGrid, Sliders, Dribbble, Palette, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PhysicsConfig, PHYSICS_PRESETS, HoopConfig, DEFAULT_HOOP_CONFIG, BallConfig, DEFAULT_BALL_CONFIG, Player } from "./types";
import { SettingsPanel } from "./components/SettingsPanel";
import { HoopEditor } from "./components/HoopEditor";
import { BallCustomizer } from "./components/BallCustomizer";
import { BallPreview } from "./components/BallPreview";

import { RoomEditor } from "./components/RoomEditor";
import { RoomConfig, RoomObject } from "./types";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [initialHoops, setInitialHoops] = useState<any[]>([]);
  const [myId, setMyId] = useState<string>("");
  const [gameState, setGameState] = useState<"lobby" | "playing" | "editing">("lobby");
  const [playerName, setPlayerName] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState("default");
  
  // Physics State
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(PHYSICS_PRESETS["Arcade Leve"]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Hoop State
  const [hoopConfig, setHoopConfig] = useState<HoopConfig>(DEFAULT_HOOP_CONFIG);
  const [isHoopEditorOpen, setIsHoopEditorOpen] = useState(false);

  // Ball State
  const [ballConfig, setBallConfig] = useState<BallConfig>(DEFAULT_BALL_CONFIG);
  const [isBallCustomizerOpen, setIsBallCustomizerOpen] = useState(true);

  // Room Editor State
  const [currentRoomEdit, setCurrentRoomEdit] = useState<RoomConfig | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomConfig[]>([]);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("init", (data) => {
      setMyId(data.id);
      setPlayers(data.players);
      setInitialHoops(data.hoops || []);
      if (data.hoopConfig) {
        setHoopConfig(prev => ({ ...DEFAULT_HOOP_CONFIG, ...prev, ...data.hoopConfig }));
      }
      newSocket.emit("room:request:list");
    });

    newSocket.on("player:joined", (player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
    });

    newSocket.on("player:moved", (data) => {
      setPlayers((prev) => ({
        ...prev,
        [data.id]: { ...prev[data.id], x: data.x, y: data.y, z: data.z || 0 },
      } as any));
    });

    newSocket.on("player:ball:updated", (data) => {
      setPlayers((prev) => ({
        ...prev,
        [data.id]: { ...prev[data.id], ballConfig: data.ballConfig },
      } as any));
    });

    newSocket.on("score:updated", (data) => {
      setPlayers((prev) => ({
        ...prev,
        [data.id]: { ...prev[data.id], score: data.score },
      } as any));
    });

    newSocket.on("room:list", (rooms) => {
      setAvailableRooms(rooms);
    });

    newSocket.on("room:data", (room) => {
      setRoomConfig(room);
    });

    newSocket.on("hoop:config:updated", (config) => {
      setHoopConfig(prev => ({ ...DEFAULT_HOOP_CONFIG, ...prev, ...config }));
    });

    newSocket.on("player:left", (id) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleHoopConfigChange = (newConfig: HoopConfig) => {
    setHoopConfig(newConfig);
    if (socket) {
      socket.emit("hoop:config:update", newConfig);
    }
  };

  const handleBallConfigChange = (newConfig: BallConfig) => {
    setBallConfig(newConfig);
    if (socket && gameState === 'playing') {
      socket.emit("player:ball:update", newConfig);
    }
  };

  const handleSaveRoom = (config: RoomConfig) => {
    if (socket) {
      socket.emit("room:save", config);
    }
    setGameState("lobby");
    setCurrentRoomEdit(null);
  };

  const handleStartGame = () => {
    if (socket && playerName.trim()) {
      socket.emit("player:setup", {
        name: playerName,
        ballConfig: ballConfig,
        roomId: currentRoomId
      });
      setGameState("playing");
    }
  };

  const createNewRoom = () => {
    setGameState("editing");
    setCurrentRoomEdit({
        id: Math.random().toString(36).substring(2, 9),
        name: "Nova Arena",
        creatorId: myId,
        worldWidth: 4000,
        worldHeight: 2500,
        maxPlayers: 10,
        matchTimeLimit: 600,
        objects: []
    });
  };

  return (
    <div className="h-screen bg-[#05050a] text-white font-sans overflow-hidden flex flex-col relative">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_transparent_70%)] opacity-60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_100%,_#4338ca_0%,_transparent_50%)] opacity-30 pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {gameState === "lobby" ? (
          <div className="flex-1 flex w-full h-full relative z-10 overflow-hidden">
            <motion.div
              key="lobby"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col items-center justify-center p-6"
            >
              <div className="max-w-xl w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 shadow-[0_0_100px_rgba(67,56,202,0.1)] flex flex-col items-center">
                <div className="flex justify-center mb-8 relative">
                  <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-[0_0_50px_rgba(79,70,229,0.4)] relative">
                    <BallPreview config={ballConfig} size={120} />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsBallCustomizerOpen(!isBallCustomizerOpen)}
                      className="absolute -bottom-2 -right-2 bg-white text-indigo-600 p-3 rounded-2xl shadow-xl border border-indigo-100 flex items-center justify-center group"
                    >
                      <Palette className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </motion.button>
                  </div>
                </div>

                <h1 className="text-5xl font-black text-center mb-2 tracking-tighter uppercase italic">
                  SKY <span className="text-indigo-400">HOOPS</span>
                </h1>
                <p className="text-indigo-300/60 text-center mb-10 text-[10px] font-black tracking-[0.4em] uppercase">
                  Orbital Basketball Protocol Active
                </p>

                <div className="space-y-6 w-full max-w-sm">
                  <div className="relative">
                    <label className="block text-[10px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-3 ml-1 opacity-80">
                      Pilot Identifier
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="ENTER CALLSIGN..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-indigo-500 transition-all font-mono text-indigo-100 placeholder:text-white/10 text-lg"
                      maxLength={15}
                    />
                  </div>
                  <button
                    onClick={handleStartGame}
                    disabled={!playerName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-4 group"
                  >
                    Initiate Launch
                    <Zap className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={createNewRoom}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-4 group"
                  >
                    Criar Nova Room
                    <LayoutGrid className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => setIsGalleryOpen(true)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Galeria
                    </button>
                    <button
                      onClick={() => {
                          if (availableRooms.length > 0) {
                              const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
                              setCurrentRoomId(randomRoom.id);
                              handleStartGame();
                          } else {
                              handleStartGame();
                          }
                      }}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Random Room
                    </button>
                  </div>
                </div>

                {isGalleryOpen && (
                  <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-6">
                    <div className="bg-[#0a0a14] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8">
                          <h3 className="font-black uppercase tracking-widest text-indigo-400 text-sm">Galeria de Rooms</h3>
                          <button onClick={() => setIsGalleryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-4">
                          {availableRooms.map(room => (
                            <button 
                              key={room.id}
                              onClick={() => {
                                  setCurrentRoomId(room.id);
                                  setIsGalleryOpen(false);
                              }}
                              className={`p-6 rounded-[2rem] border transition-all text-left group ${currentRoomId === room.id ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <h4 className="font-black uppercase tracking-widest text-xs mb-1 group-hover:text-indigo-300">{room.name}</h4>
                                <p className="text-[9px] text-white/40 uppercase tracking-widest">{room.objects.length} Objetos • Max {room.maxPlayers} Jogadores</p>
                            </button>
                          ))}
                          {availableRooms.length === 0 && (
                              <div className="col-span-2 text-center py-20 opacity-30">
                                <LayoutGrid className="w-12 h-12 mx-auto mb-4" />
                                <p className="uppercase font-black tracking-widest text-xs">Nenhuma room pública encontrada</p>
                              </div>
                          )}
                        </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 flex gap-4 w-full">
                  <div className="flex-1 items-center gap-3 text-[10px] text-indigo-400/80 uppercase font-black tracking-widest bg-indigo-500/10 px-5 py-4 rounded-3xl border border-indigo-500/20 flex flex-col justify-center">
                    <Users className="w-5 h-5 mb-1" />
                    <span>{Object.keys(players).length} Pilots Syncing</span>
                  </div>
                  <button 
                    onClick={() => setIsBallCustomizerOpen(!isBallCustomizerOpen)}
                    className={`flex-1 items-center gap-3 text-[10px] uppercase font-black tracking-widest px-5 py-4 rounded-3xl border flex flex-col justify-center transition-all ${
                      isBallCustomizerOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-indigo-400/80 hover:bg-white/10'
                    }`}
                  >
                    <Dribbble className="w-5 h-5 mb-1" />
                    <span>{isBallCustomizerOpen ? 'Close Editor' : 'Customize Ball'}</span>
                  </button>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {isBallCustomizerOpen && (
                <div className="h-full w-full max-w-md lg:max-w-xl">
                  <BallCustomizer 
                    initialConfig={ballConfig}
                    onSave={handleBallConfigChange}
                    onClose={() => setIsBallCustomizerOpen(false)}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : gameState === "editing" ? (
          <RoomEditor 
            onClose={() => setGameState("lobby")}
            onSave={handleSaveRoom}
            initialConfig={currentRoomEdit || undefined}
          />
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 relative flex flex-col h-full w-full"
          >
            {/* Game Canvas */}
            <div className="flex-1 relative w-full h-full overflow-hidden">
              {socket && (
                <GameCanvas
                  socket={socket}
                  players={players}
                  myId={myId}
                  playerName={playerName}
                  physics={physicsConfig}
                  hoopConfig={hoopConfig}
                  initialHoops={initialHoops}
                  ballConfig={ballConfig}
                  roomId={currentRoomId}
                  roomConfig={roomConfig || undefined}
                />
              )}
            </div>

            <SettingsPanel 
              config={physicsConfig} 
              onChange={setPhysicsConfig} 
              isOpen={isSettingsOpen}
              onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
            />

            <HoopEditor
              config={hoopConfig}
              onChange={handleHoopConfigChange}
              isOpen={isHoopEditorOpen}
              onToggle={() => setIsHoopEditorOpen(!isHoopEditorOpen)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBallCustomizerOpen && (
          <BallCustomizer 
            initialConfig={ballConfig}
            onSave={handleBallConfigChange}
            onClose={() => setIsBallCustomizerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
