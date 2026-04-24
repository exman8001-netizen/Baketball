import React, { useState, useRef, useEffect } from "react";
import { 
  X, Plus, Save, Trash2, Move, Box, Maximize, 
  Settings, Play, Target, Square, Triangle, ArrowUp, Zap, Ghost,
  Image as ImageIcon, Palette, Layout, MousePointer2, 
  Wind, Lock, Hash, Activity, RefreshCw, Circle, 
  DoorClosed, Radio, Layers, Stethoscope
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  RoomConfig, RoomObject, HoopConfig, DEFAULT_HOOP_CONFIG, 
  PlatformConfig, RampConfig, ElevatorConfig, SpikeTrapConfig,
  BouncePadConfig, GravityZoneConfig, GateConfig, ButtonConfig,
  PhysicsConfig, PHYSICS_PRESETS, DEFAULT_BALL_CONFIG
} from "../types";
import { GameCanvas } from "./GameCanvas";

interface RoomEditorProps {
  onSave: (config: RoomConfig) => void;
  onClose: () => void;
  initialConfig?: RoomConfig;
}

type EditorCategory = 'objectives' | 'movement' | 'challenges' | 'props' | 'interaction';

export const RoomEditor: React.FC<RoomEditorProps> = ({ onSave, onClose, initialConfig }) => {
  const [config, setConfig] = useState<RoomConfig>(initialConfig || {
    id: Math.random().toString(36).substring(2, 9),
    name: "Minha Nova Room",
    creatorId: "local",
    worldWidth: 4000,
    worldHeight: 2500,
    maxPlayers: 10,
    matchTimeLimit: 600,
    objects: []
  });

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"objects" | "settings">("objects");
  const [activeCategory, setActiveCategory] = useState<EditorCategory>('objectives');
  const [scale, setScale] = useState(0.2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isTestMode, setIsTestMode] = useState(false);
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const selectedObject = config.objects.find(o => o.id === selectedObjectId);

  const addObject = (type: RoomObject['type'], presetConfig?: any) => {
    const id = Math.random().toString(36).substring(2, 9);
    let newObj: RoomObject;

    const baseObj = {
      id, type, x: config.worldWidth / 2, y: config.worldHeight / 2, z: 0,
      width: 200, height: 50, angle: 0, behavior: 'static' as const
    };

    switch (type) {
      case 'hoop':
        newObj = { ...baseObj, config: { ...DEFAULT_HOOP_CONFIG }, width: 100, height: 100 };
        break;
      case 'fixed_hoop':
        newObj = { ...baseObj, width: 120, height: 400, config: { side: 'none', hasBackboard: true, hasColumn: true, color: '#ffffff', scoreValue: 5 } };
        break;
      case 'platform':
        newObj = { ...baseObj, width: 250, height: 40, config: { material: 'wood', bColor: '#8b4513' } };
        break;
      case 'ramp':
        newObj = { ...baseObj, width: 300, height: 100, config: { boostForce: 15, color: '#fbbf24' } };
        break;
      case 'bounce_pad':
        newObj = { ...baseObj, width: 100, height: 30, type: 'bounce_pad', config: { force: 15, color: '#4ade80', cooldown: 500 } };
        break;
      case 'elevator':
        newObj = { ...baseObj, width: 200, height: 40, config: { color: '#6366f1' }, movement: { type: 'vertical', speed: 2, range: 400, isActive: true } };
        break;
      case 'spike_trap':
        newObj = { ...baseObj, width: 150, height: 60, config: { isInstantKill: true, color: '#ff0000' } };
        break;
      case 'gravity_zone':
        newObj = { ...baseObj, width: 400, height: 400, type: 'gravity_zone', behavior: 'trigger', config: { gravityMultiplier: 0.5, color: 'rgba(79, 70, 229, 0.1)', shape: 'box' } };
        break;
      case 'gate':
        newObj = { ...baseObj, width: 40, height: 300, type: 'gate', config: { isOpen: false, color: '#6366f1', closeSpeed: 0.1 } };
        break;
      case 'button':
        newObj = { ...baseObj, width: 80, height: 20, type: 'button', behavior: 'trigger', config: { pressedColor: '#4ade80', unpressedColor: '#ef4444', isToggle: true, resetTime: 0 }, logic: { state: false, action: 'toggle' } };
        break;
      case 'prop':
        const pType = presetConfig?.type || 'water_bottle';
        let pW = 60, pH = 60;
        if(pType === 'car') { pW = 180; pH = 100; }
        if(pType === 'bench') { pW = 150; pH = 50; }
        if(pType === 'statue') { pW = 100; pH = 200; }
        
        newObj = { ...baseObj, width: pW, height: pH, config: { type: pType, color: presetConfig?.color || '#60a5fa' }, behavior: 'physics' };
        break;
      default:
        return;
    }

    setConfig(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(id);
  };

  const updateObject = (id: string, updates: Partial<RoomObject>) => {
    setConfig(prev => ({
      ...prev,
      objects: prev.objects.map(o => o.id === id ? { ...o, ...updates } : o)
    }));
  };

  const removeObject = (id: string) => {
    setConfig(prev => ({ ...prev, objects: prev.objects.filter(o => o.id !== id) }));
    setSelectedObjectId(null);
  };

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-mono text-indigo-400">{value.toFixed(step >= 1 ? 0 : 2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#05050a] flex flex-col font-sans overflow-hidden"
    >
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Arquiteto de Arenas</h2>
            <input 
              value={config.name} 
              onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent border-none outline-none text-base font-black text-white p-0 h-6 w-64 placeholder:text-white/20"
              placeholder="NOME DA ARENA..."
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTestMode(!isTestMode)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${
              isTestMode 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            }`}
          >
            {isTestMode ? <X className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isTestMode ? 'Parar Teste' : 'Testar Arena'}
          </button>
          <button 
            onClick={() => onSave(config)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            Publicar Arena
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {isTestMode ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black"
            >
              <GameCanvas 
                socket={null as any}
                players={{ local: { id: 'local', name: 'Tester', x: 2000, y: 1200, z: 0, score: 0, baskets: 0, color: '#fff', ballConfig: DEFAULT_BALL_CONFIG, roomId: 'test' } }}
                myId="local"
                playerName="Tester"
                physics={PHYSICS_PRESETS["Arcade Leve"]}
                hoopConfig={DEFAULT_HOOP_CONFIG}
                initialHoops={[]}
                ballConfig={DEFAULT_BALL_CONFIG}
                roomId="test"
                roomConfig={config}
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-white/20">
                Modo de Teste Ativo
              </div>
            </motion.div>
          ) : (
            <>
              {/* Left Toolbar - Categorized */}
              <aside className="w-24 border-r border-white/5 bg-black/20 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                <CategoryTab active={activeCategory === 'objectives'} onClick={() => setActiveCategory('objectives')} label="Objetivos" icon={<Target />} />
                <CategoryTab active={activeCategory === 'movement'} onClick={() => setActiveCategory('movement')} label="Movimento" icon={<Activity />} />
                <CategoryTab active={activeCategory === 'challenges'} onClick={() => setActiveCategory('challenges')} label="Desafio" icon={<Ghost />} />
                <CategoryTab active={activeCategory === 'props'} onClick={() => setActiveCategory('props')} label="Cenário" icon={<Box />} />
                <CategoryTab active={activeCategory === 'interaction'} onClick={() => setActiveCategory('interaction')} label="Interação" icon={<Radio />} />
                
                <div className="mt-8 px-3 space-y-4">
                  {activeCategory === 'objectives' && (
                    <>
                      <ToolItem label="Aro" icon={<Circle />} color="text-red-400" onClick={() => addObject('fixed_hoop')} />
                      <ToolItem label="Hoop Mob" icon={<Target />} color="text-rose-500" onClick={() => addObject('hoop')} />
                      <ToolItem label="Zona" icon={<Layout />} color="text-white" onClick={() => addObject('platform')} />
                    </>
                  )}
                  {activeCategory === 'movement' && (
                    <>
                      <ToolItem label="Plataf." icon={<Square />} color="text-emerald-400" onClick={() => addObject('platform')} />
                      <ToolItem label="Elevad." icon={<ArrowUp />} color="text-indigo-400" onClick={() => addObject('elevator')} />
                      <ToolItem label="Bounce" icon={<Zap />} color="text-yellow-400" onClick={() => addObject('bounce_pad')} />
                      <ToolItem label="Rampa" icon={<Triangle />} color="text-amber-400" onClick={() => addObject('ramp')} />
                    </>
                  )}
                  {activeCategory === 'challenges' && (
                    <>
                      <ToolItem label="Espinho" icon={<Ghost />} color="text-rose-400" onClick={() => addObject('spike_trap')} />
                      <ToolItem label="Gravid." icon={<Layers />} color="text-purple-400" onClick={() => addObject('gravity_zone')} />
                      <ToolItem label="Frágil" icon={<Maximize />} color="text-blue-300" onClick={() => addObject('breakable_platform')} />
                      <ToolItem label="Vento" icon={<Wind />} color="text-cyan-400" onClick={() => addObject('gravity_zone')} />
                    </>
                  )}
                  {activeCategory === 'props' && (
                    <>
                      <ToolItem label="Carro" icon={<Box />} color="text-rose-500" onClick={() => addObject('prop', { type: 'car' })} />
                      <ToolItem label="Poste" icon={<Maximize />} color="text-slate-400" onClick={() => addObject('prop', { type: 'pole' })} />
                      <ToolItem label="Mesa V." icon={<Layout />} color="text-blue-300" onClick={() => addObject('prop', { type: 'glass_table' })} />
                      <ToolItem label="Troféu" icon={<Target />} color="text-yellow-500" onClick={() => addObject('prop', { type: 'trophy' })} />
                      <ToolItem label="Estátua" icon={<Layers />} color="text-slate-200" onClick={() => addObject('prop', { type: 'statue' })} />
                      <ToolItem label="Cone" icon={<Triangle />} color="text-orange-500" onClick={() => addObject('prop', { type: 'cone' })} />
                      <ToolItem label="Banco" icon={<Square />} color="text-amber-800" onClick={() => addObject('prop', { type: 'bench' })} />
                      <ToolItem label="Esparadrapo" icon={<Stethoscope />} color="text-white" onClick={() => addObject('tape')} />
                    </>
                  )}
                  {activeCategory === 'interaction' && (
                    <>
                      <ToolItem label="Botão" icon={<Radio />} color="text-rose-500" onClick={() => addObject('button')} />
                      <ToolItem label="Porta" icon={<DoorClosed />} color="text-indigo-500" onClick={() => addObject('gate')} />
                    </>
                  )}
                </div>
              </aside>

              {/* Viewport Canvas */}
              <main 
                className="flex-1 relative bg-[radial-gradient(#1e1e30_1px,transparent_1px)] [background-size:40px_40px] overflow-hidden cursor-crosshair"
                onMouseDown={(e) => {
                  if (e.button === 1 || (e.button === 0 && e.altKey)) {
                    setIsDraggingCanvas(true);
                    lastMousePos.current = { x: e.clientX, y: e.clientY };
                  }
                }}
                onMouseMove={(e) => {
                  if (isDraggingCanvas) {
                    const dx = e.clientX - lastMousePos.current.x;
                    const dy = e.clientY - lastMousePos.current.y;
                    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                    lastMousePos.current = { x: e.clientX, y: e.clientY };
                  }
                }}
                onMouseUp={() => setIsDraggingCanvas(false)}
                onWheel={(e) => {
                  const delta = e.deltaY > 0 ? 0.9 : 1.1;
                  setScale(prev => Math.max(0.01, Math.min(prev * delta, 2)));
                }}
                onContextMenu={e => e.preventDefault()}
              >
                <div 
                  style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    width: config.worldWidth,
                    height: config.worldHeight,
                    position: 'absolute'
                  }}
                  className="bg-black/40 border-4 border-indigo-500/20 shadow-[0_0_100px_rgba(79,70,229,0.05)]"
                >
                  {config.objects.map(obj => (
                    <RoomObjectView 
                      key={obj.id} obj={obj} 
                      isSelected={selectedObjectId === obj.id}
                      onSelect={() => setSelectedObjectId(obj.id)}
                      onMove={(x, y) => updateObject(obj.id, { x, y })}
                      scale={scale}
                    />
                  ))}
                </div>

                <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                    <MousePointer2 className="w-3 h-3" />
                    <span>X: {offset.x.toFixed(0)} Y: {offset.y.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="w-3 h-3" />
                    <span>ZOOM: {(scale * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </main>

              {/* Right Inspector - Smart Properties */}
              <aside className="w-96 border-l border-white/5 bg-black/40 backdrop-blur-3xl overflow-y-auto custom-scrollbar shrink-0">
                <div className="flex p-2 bg-white/5 m-4 rounded-xl border border-white/5">
                  <InspectorTab active={activeTab === 'objects'} onClick={() => setActiveTab('objects')} icon={<Box />} label="Objeto" />
                  <InspectorTab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings />} label="Arena" />
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'objects' ? (
                    selectedObject ? (
                      <motion.div 
                        key={selectedObject.id}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="px-6 pb-20 space-y-8"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 capitalize">{selectedObject.type.replace('_', ' ')}</h3>
                            <p className="text-[9px] text-white/20 font-mono mt-1">ID: {selectedObjectId}</p>
                          </div>
                          <button onClick={() => removeObject(selectedObjectId!)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <Section label="Geometria">
                          <div className="grid grid-cols-2 gap-4">
                            {renderSlider("X", selectedObject.x, 0, config.worldWidth, 1, val => updateObject(selectedObject.id, { x: val }))}
                            {renderSlider("Y", selectedObject.y, 0, config.worldHeight, 1, val => updateObject(selectedObject.id, { y: val }))}
                            {renderSlider("L", selectedObject.width, 10, 2000, 1, val => updateObject(selectedObject.id, { width: val }))}
                            {renderSlider("A", selectedObject.height, 10, 2000, 1, val => updateObject(selectedObject.id, { height: val }))}
                          </div>
                          <div className="mt-4">
                            {renderSlider("Rotação", selectedObject.angle, 0, 360, 1, val => updateObject(selectedObject.id, { angle: val }))}
                          </div>
                        </Section>

                        <Section label="Movimento Inteligente">
                          <div className="grid grid-cols-2 gap-2">
                             {['none', 'horizontal', 'vertical', 'circular'].map(m => (
                               <button 
                                 key={m}
                                 onClick={() => updateObject(selectedObject.id, { 
                                   movement: { 
                                     type: m as any, 
                                     speed: 2, 
                                     range: 400, 
                                     isActive: true,
                                     phase: selectedObject.movement?.phase || 0
                                   } 
                                 })}
                                 className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${selectedObject.movement?.type === m ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                               >
                                 {m}
                               </button>
                             ))}
                          </div>
                          {selectedObject.movement?.type !== 'none' && (
                            <div className="mt-4 space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                              {renderSlider("Velocidade", selectedObject.movement?.speed || 2, 0.1, 20, 0.1, val => updateObject(selectedObject.id, { movement: { ...selectedObject.movement!, speed: val } }))}
                              {renderSlider("Distância", selectedObject.movement?.range || 400, 10, 2000, 10, val => updateObject(selectedObject.id, { movement: { ...selectedObject.movement!, range: val } }))}
                              <button 
                                onClick={() => updateObject(selectedObject.id, { movement: { ...selectedObject.movement!, isActive: !selectedObject.movement?.isActive } })}
                                className={`w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${selectedObject.movement?.isActive ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}
                              >
                                {selectedObject.movement?.isActive ? 'Ativo' : 'Parado'}
                              </button>
                            </div>
                          )}
                        </Section>

                        <Section label="Lógica e Gatilhos">
                          <div className="space-y-4">
                            <div className="flex gap-2">
                               <input 
                                 value={selectedObject.logic?.targetId || ''} 
                                 onChange={e => updateObject(selectedObject.id, { logic: { ...selectedObject.logic!, targetId: e.target.value, state: false } })}
                                 className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-mono text-indigo-300 placeholder:text-white/10"
                                 placeholder="ID ALVO (Porta/Botão)"
                               />
                               <button className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10">
                                 <Plus className="w-4 h-4 text-white/40" />
                               </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {['toggle', 'activate', 'destroy'].map(a => (
                                <button 
                                  key={a}
                                  onClick={() => updateObject(selectedObject.id, { logic: { ...selectedObject.logic!, action: a as any, state: false } })}
                                  className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${selectedObject.logic?.action === a ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>
                        </Section>

                        <Section label="Customização Visual">
                           <div className="flex flex-wrap gap-2">
                              {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#6366f1', '#ffffff', '#000000'].map(c => (
                                <button 
                                  key={c}
                                  onClick={() => updateObject(selectedObject.id, { config: { ...selectedObject.config, color: c } })}
                                  className={`w-8 h-8 rounded-full border-2 ${selectedObject.config?.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                           </div>
                        </Section>
                      </motion.div>
                    ) : (
                      <div className="h-96 flex flex-col items-center justify-center text-center opacity-20 px-10">
                        <Box className="w-16 h-16 mb-4" />
                        <h4 className="text-xs font-black uppercase tracking-widest mb-2">Seleção Vazia</h4>
                        <p className="text-[9px] uppercase tracking-widest leading-relaxed">Selecione um objeto no canvas para editar suas propriedades mentais.</p>
                      </div>
                    )
                  ) : (
                    <motion.div 
                      key="settings"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="px-6 pb-20 space-y-8"
                    >
                      <Section label="Identidade da Arena">
                        <input 
                          value={config.name} 
                          onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-indigo-500 outline-none transition-all"
                          placeholder="Nova Arena Digital"
                        />
                      </Section>

                      <Section label="Visual e Atmosfera">
                        <div className="space-y-4">
                           <div>
                              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Fundo do Cenário</p>
                              <select 
                                value={config.backgroundType || 'space'} 
                                onChange={e => setConfig(prev => ({ ...prev, backgroundType: e.target.value as any }))}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/70 focus:border-indigo-500 outline-none"
                              >
                                <option value="space">Espaço Profundo</option>
                                <option value="street">Quadra de Rua</option>
                                <option value="park">Parque Público</option>
                                <option value="gym">Ginásio Escolar</option>
                                <option value="urban">Urbano Noturno</option>
                                <option value="stadium_day">Estádio Olímpico</option>
                                <option value="stadium_night">Arena Night</option>
                              </select>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Piso da Arena</p>
                              <div className="flex gap-2">
                                 {['#f59e0b', '#1e40af', '#166534', '#334155', '#451a03', '#ffffff'].map(c => (
                                    <button 
                                       key={c}
                                       onClick={() => setConfig(prev => ({ ...prev, floorColor: c }))}
                                       className={`w-8 h-8 rounded-lg border-2 transition-all ${config.floorColor === c ? 'border-indigo-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                       style={{ backgroundColor: c }}
                                    />
                                 ))}
                              </div>
                           </div>
                        </div>
                      </Section>

                      <Section label="Regras Globais">
                        {renderSlider("Gravidade", config.gravityOverride || 1, 0.1, 3.0, 0.1, val => setConfig(prev => ({ ...prev, gravityOverride: val })))}
                        <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
                           {renderSlider("Max Jogadores", config.maxPlayers, 2, 64, 1, val => setConfig(prev => ({ ...prev, maxPlayers: val })))}
                           {renderSlider("Tempo (Segmentos)", config.matchTimeLimit, 60, 3600, 60, val => setConfig(prev => ({ ...prev, matchTimeLimit: val })))}
                        </div>
                      </Section>

                      <Section label="Estrutura da Arena">
                        <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Parede Lateral</span>
                            <button 
                              onClick={() => setConfig(prev => ({ ...prev, hasWall: !prev.hasWall }))}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${config.hasWall ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/5 text-white/30'}`}
                            >
                              {config.hasWall ? 'SIM' : 'NÃO'}
                            </button>
                          </div>
                          {config.hasWall && renderSlider("Largura Parede", config.wallWidth || 100, 20, 1000, 10, val => setConfig(prev => ({ ...prev, wallWidth: val })))}
                          
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Teto</span>
                            <button 
                              onClick={() => setConfig(prev => ({ ...prev, hasCeiling: !prev.hasCeiling }))}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${config.hasCeiling ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/5 text-white/30'}`}
                            >
                              {config.hasCeiling ? 'SIM' : 'NÃO'}
                            </button>
                          </div>
                          {config.hasCeiling && renderSlider("Altura Teto", config.ceilingHeight || 200, 20, 1000, 10, val => setConfig(prev => ({ ...prev, ceilingHeight: val })))}
                          
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Evolução da Bola</span>
                            <button 
                              onClick={() => setConfig(prev => ({ ...prev, enableEvolution: !prev.enableEvolution }))}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${config.enableEvolution ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/5 text-white/30'}`}
                            >
                              {config.enableEvolution ? 'ATIVADO' : 'DESATIVADO'}
                            </button>
                          </div>

                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Janelas</span>
                              <button 
                                onClick={() => {
                                  const newWin = { x: config.worldWidth / 2, y: 500, width: 400, height: 300 };
                                  setConfig(prev => ({ ...prev, windows: [...(prev.windows || []), newWin] }));
                                }}
                                className="p-1 px-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-md text-[8px] font-black uppercase"
                              >
                                + Adicionar
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              {(config.windows || []).map((win, i) => (
                                <div key={i} className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 relative">
                                  <button 
                                    onClick={() => setConfig(prev => ({ ...prev, windows: prev.windows?.filter((_, index) => index !== i) }))}
                                    className="absolute top-2 right-2 p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  {renderSlider(`Pos X #${i+1}`, win.x, 0, config.worldWidth, 1, val => setConfig(prev => {
                                    const next = [...(prev.windows || [])];
                                    next[i] = { ...next[i], x: val };
                                    return { ...prev, windows: next };
                                  }))}
                                  {renderSlider(`Pos Y #${i+1}`, win.y, 0, config.worldHeight, 1, val => setConfig(prev => {
                                    const next = [...(prev.windows || [])];
                                    next[i] = { ...next[i], y: val };
                                    return { ...prev, windows: next };
                                  }))}
                                  {renderSlider(`Largura #${i+1}`, win.width, 50, 1000, 1, val => setConfig(prev => {
                                    const next = [...(prev.windows || [])];
                                    next[i] = { ...next[i], width: val };
                                    return { ...prev, windows: next };
                                  }))}
                                  {renderSlider(`Altura #${i+1}`, win.height, 50, 1000, 1, val => setConfig(prev => {
                                    const next = [...(prev.windows || [])];
                                    next[i] = { ...next[i], height: val };
                                    return { ...prev, windows: next };
                                  }))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Section>

                      <div className="pt-10">
                        <button 
                          onClick={() => setConfig(prev => ({ ...prev, id: Math.random().toString(36).substring(2, 9) }))}
                          className="w-full py-4 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerar Seed da Room
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </aside>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
      `}</style>
    </motion.div>
  );
};

const Section = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-4">
    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60 pl-1">{label}</h4>
    {children}
  </div>
);

const CategoryTab = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full py-6 flex flex-col items-center gap-2 transition-all border-b border-white/5 ${active ? 'bg-indigo-600/10 text-indigo-400' : 'text-white/20 hover:bg-white/5'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 shadow-indigo-500/20" })}
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const ToolItem = ({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="group flex flex-col items-center gap-2 w-full"
  >
    <div className={`w-full aspect-square flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 group-hover:border-indigo-500/50 transition-all ${color}`}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </div>
    <span className="text-[7px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 text-center">{label}</span>
  </motion.button>
);

const InspectorTab = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
    {label}
  </button>
);

const RoomObjectView: React.FC<{ 
  obj: RoomObject, 
  isSelected: boolean, 
  onSelect: () => void, 
  onMove: (x: number, y: number) => void,
  scale: number
}> = ({ obj, isSelected, onSelect, onMove, scale }) => {
  const isDragging = useRef(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
         const dx = e.movementX / scale;
         const dy = e.movementY / scale;
         onMove(obj.x + dx, obj.y + dy);
      }
    };
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [obj.x, obj.y, scale, onMove]);

  return (
    <div 
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); isDragging.current = true; }}
      style={{
        width: obj.width,
        height: obj.height,
        left: obj.x - obj.width/2,
        top: obj.y - obj.height/2,
        transform: `rotate(${obj.angle}deg)`,
        position: 'absolute',
      }}
      className={`
        border-2 flex flex-col items-center justify-center transition-all cursor-move group
        ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(79,70,229,0.4)] z-50' : 'border-white/10 bg-black/20 hover:border-white/30'}
        ${obj.type === 'hoop' ? 'rounded-full' : 'rounded-xl'}
      `}
    >
      <div className="scale-[0.8] opacity-50 group-hover:opacity-100 transition-opacity">
        {obj.type === 'hoop' && <Target className="w-6 h-6 text-red-500" />}
        {obj.type === 'platform' && <Square className="w-6 h-6 text-emerald-500" />}
        {obj.type === 'ramp' && <Triangle className="w-6 h-6 text-amber-500" />}
        {obj.type === 'bounce_pad' && <Zap className="w-6 h-6 text-yellow-400" />}
        {obj.type === 'gravity_zone' && <Layers className="w-6 h-6 text-purple-400" />}
        {obj.type === 'gate' && <DoorClosed className="w-6 h-6 text-indigo-500" />}
        {obj.type === 'button' && <Radio className="w-6 h-6 text-rose-500 shadow-glow" />}
        {obj.type === 'fixed_hoop' && <Circle className="w-6 h-6 text-white" />}
        {obj.type === 'breakable_platform' && <Layers className="w-6 h-6 text-orange-400 opacity-50" />}
      </div>
      {isSelected && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest whitespace-nowrap">
           {obj.type} • {obj.width.toFixed(0)}x{obj.height.toFixed(0)}
        </div>
      )}
    </div>
  );
};

const ToolbarButton = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }} 
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="group flex flex-col items-center gap-1.5"
  >
    <div className={`p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 group-hover:border-white/20 transition-all ${color}`}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">{label}</span>
  </motion.button>
);

