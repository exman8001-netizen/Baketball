import React, { useState, useRef, useEffect } from "react";
import { 
  X, Plus, Save, Trash2, Move, Box, Maximize, 
  Settings, Play, Target, Square, Triangle, ArrowUp, Zap, Ghost
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  RoomConfig, RoomObject, HoopConfig, DEFAULT_HOOP_CONFIG, 
  PlatformConfig, RampConfig, ElevatorConfig, SpikeTrapConfig 
} from "../types";

interface RoomEditorProps {
  onSave: (config: RoomConfig) => void;
  onClose: () => void;
  initialConfig?: RoomConfig;
}

export const RoomEditor: React.FC<RoomEditorProps> = ({ onSave, onClose, initialConfig }) => {
  const [config, setConfig] = useState<RoomConfig>(initialConfig || {
    id: Math.random().toString(36).substr(2, 9),
    name: "Minha Nova Room",
    creatorId: "local",
    worldWidth: 12000,
    worldHeight: 8000,
    maxPlayers: 10,
    matchTimeLimit: 300,
    objects: []
  });

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"objects" | "settings">("objects");
  const [scale, setScale] = useState(0.1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const selectedObject = config.objects.find(o => o.id === selectedObjectId);

  const addObject = (type: RoomObject['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    let newObj: RoomObject;

    const baseObj = {
      id, type, x: config.worldWidth / 2, y: config.worldHeight / 2, z: 0,
      width: 200, height: 50, angle: 0, behavior: 'static' as const
    };

    switch (type) {
      case 'hoop':
        newObj = { ...baseObj, config: { ...DEFAULT_HOOP_CONFIG }, width: 100, height: 100 };
        break;
      case 'platform':
        newObj = { ...baseObj, config: { width: 200, height: 30, material: 'wood', bounciness: 0.2, bcolor: '#8b4513' } };
        break;
      case 'ramp':
        newObj = { ...baseObj, width: 300, height: 100, config: { boostForce: 15, color: '#fbbf24' } };
        break;
      case 'elevator':
        newObj = { ...baseObj, width: 200, height: 40, behavior: 'moving', config: { speed: 2, range: 400, color: '#6366f1' } };
        break;
      case 'spike_trap':
        newObj = { ...baseObj, width: 150, height: 60, config: { isInstantKill: true } };
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDraggingCanvas(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => setIsDraggingCanvas(false);

  const handleCanvasWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.01, Math.min(prev * delta, 2)));
  };

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
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
      className="fixed inset-0 z-[100] bg-[#05050a] flex flex-col font-sans"
    >
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">Editor de Room</h2>
            <input 
              value={config.name} 
              onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent border-none outline-none text-lg font-black text-white p-0 h-6 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSave(config)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            Salvar Room
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-20 border-r border-white/5 bg-black/20 flex flex-col items-center py-6 gap-6 shrink-0">
          <ToolbarButton icon={<Target />} label="Aro" onClick={() => addObject('hoop')} color="text-red-400" />
          <ToolbarButton icon={<Square />} label="Plataf." onClick={() => addObject('platform')} color="text-emerald-400" />
          <ToolbarButton icon={<Triangle />} label="Rampa" onClick={() => addObject('ramp')} color="text-amber-400" />
          <ToolbarButton icon={<ArrowUp />} label="Elevad." onClick={() => addObject('elevator')} color="text-indigo-400" />
          <ToolbarButton icon={<Ghost />} label="Espinho" onClick={() => addObject('spike_trap')} color="text-rose-400" />
        </aside>

        {/* Viewport Canvas */}
        <main 
          ref={viewportRef}
          className="flex-1 relative bg-[radial-gradient(#1e1e30_1px,transparent_1px)] [background-size:40px_40px] overflow-hidden cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
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
                key={obj.id} 
                obj={obj} 
                isSelected={selectedObjectId === obj.id}
                onSelect={() => setSelectedObjectId(obj.id)}
                onMove={(x, y) => updateObject(obj.id, { x, y })}
                scale={scale}
              />
            ))}
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-mono text-white/40">
            <span>X: {offset.x.toFixed(0)}</span>
            <span>Y: {offset.y.toFixed(0)}</span>
            <span>ZOOM: {(scale * 100).toFixed(0)}%</span>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-80 border-l border-white/5 bg-black/40 backdrop-blur-3xl overflow-y-auto px-6 py-8 gap-8 flex flex-col shrink-0">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('objects')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'objects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Propriedades
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Sala
            </button>
          </div>

          {activeTab === 'objects' ? (
            selectedObject ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 capitalize">{selectedObject.type}</h3>
                    <p className="text-[10px] text-white/30 font-mono mt-1">ID: {selectedObjectId}</p>
                  </div>
                  <button onClick={() => removeObject(selectedObjectId!)} className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {renderSlider("Posição X", selectedObject.x, 0, config.worldWidth, 1, val => updateObject(selectedObject.id, { x: val }))}
                  {renderSlider("Posição Y", selectedObject.y, 0, config.worldHeight, 1, val => updateObject(selectedObject.id, { y: val }))}
                  {renderSlider("Largura", selectedObject.width, 10, 1000, 1, val => updateObject(selectedObject.id, { width: val }))}
                  {renderSlider("Altura", selectedObject.height, 10, 1000, 1, val => updateObject(selectedObject.id, { height: val }))}
                  {renderSlider("Rotação", selectedObject.angle, 0, 360, 1, val => updateObject(selectedObject.id, { angle: val }))}
                </div>

                <div className="pt-6 border-t border-white/5 space-y-6">
                  <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Comportamento</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['static', 'moving', 'falling', 'destroyable'].map(b => (
                      <button 
                        key={b}
                        onClick={() => updateObject(selectedObject.id, { behavior: b as any })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedObject.behavior === b ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {selectedObject.behavior === 'moving' && (
                    <div className="space-y-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                      {renderSlider("Alcance", selectedObject.movementRange || 400, 0, 2000, 10, val => updateObject(selectedObject.id, { movementRange: val }))}
                      {renderSlider("Velocidade", selectedObject.movementSpeed || 2, 0.1, 10, 0.1, val => updateObject(selectedObject.id, { movementSpeed: val }))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
                <Box className="w-12 h-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest leading-relaxed">Nenhum objeto<br/>selecionado</p>
              </div>
            )
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Dimensões do Mundo</h3>
                {renderSlider("Largura do Mundo", config.worldWidth, 1000, 20000, 100, val => setConfig(prev => ({ ...prev, worldWidth: val })))}
                {renderSlider("Altura do Mundo", config.worldHeight, 1000, 20000, 100, val => setConfig(prev => ({ ...prev, worldHeight: val })))}
              </div>

              <div className="space-y-6 pt-6 border-t border-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Configuração de Partida</h3>
                {renderSlider("Limite de Jogadores", config.maxPlayers, 1, 50, 1, val => setConfig(prev => ({ ...prev, maxPlayers: val })))}
                {renderSlider("Tempo (Segundos)", config.matchTimeLimit, 60, 3600, 60, val => setConfig(prev => ({ ...prev, matchTimeLimit: val })))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
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

const RoomObjectView: React.FC<{ 
  obj: RoomObject, 
  isSelected: boolean, 
  onSelect: () => void, 
  onMove: (x: number, y: number) => void,
  scale: number
}> = ({ obj, isSelected, onSelect, onMove, scale }) => {
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
         // Convert screen movement to world movement
         // scale is global across the editor
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
  }, []);

  return (
    <div 
      onMouseDown={handleMouseDown}
      style={{
        width: obj.width,
        height: obj.height,
        left: obj.x - obj.width/2,
        top: obj.y - obj.height/2,
        transform: `rotate(${obj.angle}deg)`,
        position: 'absolute',
      }}
      className={`
        border-2 flex items-center justify-center transition-shadow cursor-move
        ${isSelected ? 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5)] z-50' : 'border-white/10 hover:border-white/20'}
        ${obj.type === 'hoop' ? 'rounded-full bg-red-500/20' : ''}
        ${obj.type === 'platform' ? 'rounded-md bg-emerald-500/20' : ''}
        ${obj.type === 'ramp' ? 'bg-amber-500/20' : ''}
        ${obj.type === 'elevator' ? 'bg-indigo-500/20' : ''}
        ${obj.type === 'spike_trap' ? 'bg-rose-500/20' : ''}
      `}
    >
      <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">{obj.type}</span>
    </div>
  );
};
