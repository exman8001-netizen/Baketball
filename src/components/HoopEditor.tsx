import React from "react";
import { HoopConfig, HOOP_PRESETS, HoopType, DEFAULT_HOOP_CONFIG } from "../types";
import { Layers, X, RotateCcw, Zap, Move, Maximize, Palette, Box, Activity, Crown, Sliders, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HoopEditorProps {
  config: HoopConfig;
  onChange: (config: HoopConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const HoopEditor: React.FC<HoopEditorProps> = ({ config, onChange, isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = React.useState<string>("geral");

  const handleInputChange = (key: keyof HoopConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleHoopTypeChange = (index: number, key: keyof HoopType, value: any) => {
    const newHoopTypes = [...config.hoopTypes];
    newHoopTypes[index] = { ...newHoopTypes[index], [key]: value };
    handleInputChange("hoopTypes", newHoopTypes);
  };

  const renderSlider = (label: string, key: keyof HoopConfig, min: number, max: number, step: number, unit: string = "") => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter">
        <span className="text-indigo-300/60">{label}</span>
        <span className="text-white bg-indigo-500/20 px-2 py-0.5 rounded-md">
          {typeof config[key] === 'number' ? (config[key] as number).toFixed(step < 1 ? 2 : 0) : config[key]} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={config[key] as number}
        onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
      />
    </div>
  );

  const renderToggle = (label: string, key: keyof HoopConfig) => (
    <div className="flex justify-between items-center py-2 hover:bg-white/5 px-2 rounded-lg transition-colors">
      <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60">{label}</span>
      <button
        onClick={() => handleInputChange(key, !config[key])}
        className={`w-10 h-5 rounded-full transition-all relative ${config[key] ? 'bg-indigo-500' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  const renderSelect = (label: string, key: keyof HoopConfig, options: { value: string, label: string }[]) => (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60 ml-1">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleInputChange(key, opt.value)}
            className={`p-2 text-[9px] font-black uppercase tracking-tighter rounded-xl border transition-all ${
              config[key] === opt.value 
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
              : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: "geral", icon: Layers, label: "Geral" },
    { id: "mov", icon: Move, label: "Movimento" },
    { id: "angle", icon: RotateCcw, label: "Ângulos" },
    { id: "shape", icon: Maximize, label: "Forma" },
    { id: "colors", icon: Palette, label: "Cores" },
    { id: "plat", icon: Box, label: "Plataformas" },
    { id: "back", icon: Box, label: "Quadro" },
    { id: "net", icon: Activity, label: "Rede" },
    { id: "phys", icon: Activity, label: "Combos/Física" },
  ];

  const handlePlatformChange = (key: keyof typeof config.platform, value: any) => {
    onChange({ ...config, platform: { ...config.platform, [key]: value } });
  };

  const renderPlatformSlider = (label: string, key: keyof typeof config.platform, min: number, max: number, step: number, unit: string = "") => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter">
        <span className="text-indigo-300/60">{label}</span>
        <span className="text-white bg-indigo-500/20 px-2 py-0.5 rounded-md">
          {typeof config.platform[key] === 'number' ? (config.platform[key] as number).toFixed(step < 1 ? 2 : 0) : config.platform[key]} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={config.platform[key] as number}
        onChange={(e) => handlePlatformChange(key, parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
      />
    </div>
  );

  const renderPlatformSelect = (label: string, key: keyof typeof config.platform, options: { value: string, label: string }[]) => (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60 ml-1">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePlatformChange(key, opt.value)}
            className={`p-2 text-[9px] font-black uppercase tracking-tighter rounded-xl border transition-all ${
              config.platform[key] === opt.value 
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
              : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-8 right-32 z-50 p-4 bg-indigo-600 rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:scale-110 active:scale-95 transition-all text-white group flex items-center gap-2"
      >
        <Sliders className={`w-6 h-6 ${isOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
        {!isOpen && <span className="font-black text-xs uppercase tracking-widest hidden md:block">Editor de Aros</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 z-50 w-96 max-h-[85vh] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-indigo-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                  <Crown className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white">Editor Supremo</h3>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest opacity-60">Protocolo de Customização</p>
                </div>
              </div>
              <button 
                onClick={onToggle} 
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex px-4 py-4 bg-white/5 gap-2 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Presets Grid - always visible top of scroll */}
            <div className="p-6 pb-2 border-b border-white/5">
              <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-3 ml-1">Presets Rápidos</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(HOOP_PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => onChange(HOOP_PRESETS[name])}
                    className="p-3 bg-indigo-500/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/40 rounded-2xl transition-all text-[9px] font-black uppercase tracking-tighter text-left flex items-center justify-between group"
                  >
                    <span className="text-white/80 group-hover:text-white transition-colors">{name}</span>
                    <Zap className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 scrollbar-hide">
              {activeTab === "geral" && (
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {renderSlider("Máximo de Aros", "maxHoops", 1, 50, 1)}
                  {renderSlider("Spawn (ms)", "spawnInterval", 200, 5000, 100)}
                  {renderSlider("Velocidade Queda", "globalFallSpeed", 0.5, 15, 0.5)}
                  {renderToggle("Velocidades Individuais", "individualSpeeds")}
                  {renderSlider("Chance Multi-Spawn", "multiSpawnChance", 0, 1, 0.05)}
                  {renderSelect("Padrão de Spawn", "spawnPattern", [
                    { value: 'random', label: 'Aleatório' },
                    { value: 'pairs', label: 'Em Pares' },
                    { value: 'staggered', label: 'Escalonado' },
                    { value: 'groups', label: 'Grupos' }
                  ])}
                </section>
              )}

              {activeTab === "mov" && (
                <section className="space-y-6">
                  {renderSelect("Estilo de Queda", "movementType", [
                    { value: 'linear', label: 'Reto' },
                    { value: 'zigzag', label: 'Zig-Zag' },
                    { value: 'wave', label: 'Ondulado' },
                    { value: 'diagonal-rl', label: 'Diag. Dir->Esq' },
                    { value: 'diagonal-lr', label: 'Diag. Esq->Dir' },
                    { value: 'circular', label: 'Circular' },
                    { value: 'random', label: 'Aleatório' }
                  ])}
                  {renderSelect("Velocidade Rotação", "rotationType", [
                    { value: 'none', label: 'Estatico' },
                    { value: 'slow', label: 'Lenta' },
                    { value: 'medium', label: 'Média' },
                    { value: 'fast', label: 'Rápida' },
                    { value: 'random', label: 'Aleatório' }
                  ])}
                </section>
              )}

              {activeTab === "angle" && (
                <section className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60 ml-1">Ângulos Permitidos</span>
                    <div className="flex flex-wrap gap-2">
                       {[0, 30, 45, 60, 90].map(angle => (
                         <button
                           key={angle}
                           onClick={() => {
                             const current = config.allowedAngles || [];
                             const next = current.includes(angle) 
                               ? current.filter(a => a !== angle)
                               : [...current, angle];
                             handleInputChange("allowedAngles", next.length > 0 ? next : [0]);
                           }}
                           className={`px-3 py-2 rounded-lg text-[10px] font-black border transition-all ${
                             (config.allowedAngles || []).includes(angle)
                             ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                             : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                           }`}
                         >
                           {angle}°
                         </button>
                       ))}
                    </div>
                  </div>
                  {renderToggle("Variação Aleatória (+/-)", "randomAngleRange")}
                  {renderToggle("Ângulo Fixo por Tipo", "lockAngleByType")}
                </section>
              )}

              {activeTab === "shape" && (
                <section className="space-y-6">
                  {renderSlider("Tamanho Base", "baseSize", 20, 150, 5)}
                  {renderSlider("Largura Borda", "borderWidth", 1, 15, 1)}
                  {renderSelect("Variação de Tamanho", "sizeVariation", [
                    { value: 'fixed', label: 'Fixo' },
                    { value: 'small', label: 'Pequeno' },
                    { value: 'medium', label: 'Médio' },
                    { value: 'large', label: 'Grande' },
                    { value: 'random', label: 'Aleatório' }
                  ])}
                  {renderSelect("Dinamismo", "dynamicSizing", [
                    { value: 'none', label: 'Nenhum' },
                    { value: 'growing', label: 'Crescente' },
                    { value: 'shrinking', label: 'Decrescente' },
                    { value: 'pulsing', label: 'Pulsante' },
                    { value: 'expand-on-hit', label: 'Expandir Impacto' }
                  ])}
                </section>
              )}

              {activeTab === "colors" && (
                <section className="space-y-6">
                  {config.hoopTypes.map((type, idx) => (
                    <div key={type.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg shadow-lg" style={{ backgroundColor: type.color }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{type.label}</span>
                      </div>
                      <div className="space-y-3">
                         <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase font-bold text-white/40">
                              <span>Pontuação</span>
                              <span>+{type.score}</span>
                            </div>
                            <input
                              type="range" min="1" max="100" value={type.score}
                              onChange={(e) => handleHoopTypeChange(idx, "score", parseInt(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                            />
                         </div>
                         <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase font-bold text-white/40">
                              <span>Chance Spawn</span>
                              <span>{(type.spawnChance * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.01" value={type.spawnChance}
                              onChange={(e) => handleHoopTypeChange(idx, "spawnChance", parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                            />
                         </div>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {activeTab === "plat" && (
                <section className="space-y-6">
                  <div className="flex justify-between items-center py-2 hover:bg-white/5 px-2 rounded-lg transition-colors">
                    <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60">Ativar Plataformas</span>
                    <button
                      onClick={() => handlePlatformChange("enabled", !config.platform.enabled)}
                      className={`w-10 h-5 rounded-full transition-all relative ${config.platform.enabled ? 'bg-indigo-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${config.platform.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {config.platform.enabled && (
                    <>
                      {renderPlatformSlider("Chance de Spawn", "spawnChance", 0, 1, 0.05)}
                      {renderPlatformSlider("Largura", "width", 40, 400, 10)}
                      {renderPlatformSlider("Altura", "height", 5, 50, 5)}
                      {renderPlatformSelect("Material", "material", [
                        { value: 'wood', label: 'Madeira' },
                        { value: 'metal', label: 'Metal' },
                        { value: 'neon', label: 'Neon' },
                        { value: 'ice', label: 'Gelo' },
                        { value: 'stone', label: 'Pedra' },
                        { value: 'glass', label: 'Vidro' }
                      ])}
                      {renderPlatformSelect("Movimento", "movementType", [
                        { value: 'stationary', label: 'Fixo' },
                        { value: 'horizontal', label: 'Lado a Lado' },
                        { value: 'vertical', label: 'Cima/Baixo' },
                        { value: 'rotate', label: 'Gira' },
                        { value: 'follow-hoop', label: 'Segue Aro' }
                      ])}
                      {config.platform.movementType !== 'stationary' && config.platform.movementType !== 'follow-hoop' && (
                        renderPlatformSlider("Velocidade Movimento", "movementSpeed", 0.5, 10, 0.5)
                      )}
                      
                      <div className="flex justify-between items-center py-2 px-2">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/60 transition-colors">Coluna de Suporte</span>
                        <button
                          onClick={() => handlePlatformChange("hasSupportColumn", !config.platform.hasSupportColumn)}
                          className={`w-10 h-5 rounded-full transition-all relative ${config.platform.hasSupportColumn ? 'bg-indigo-500' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${config.platform.hasSupportColumn ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center py-2 px-2">
                        <span className="text-[10px] uppercase font-bold text-indigo-300/60 transition-colors">Quebrável</span>
                        <button
                          onClick={() => handlePlatformChange("isBreakable", !config.platform.isBreakable)}
                          className={`w-10 h-5 rounded-full transition-all relative ${config.platform.isBreakable ? 'bg-indigo-500' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${config.platform.isBreakable ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}

              {activeTab === "back" && (
                <section className="space-y-6">
                  {renderToggle("Ativar Quadro", "backboardEnabled")}
                  {config.backboardEnabled && (
                    <>
                      {renderSlider("Largura", "backboardWidth", 40, 300, 5)}
                      {renderSlider("Altura", "backboardHeight", 20, 200, 5)}
                      {renderToggle("Transparente", "backboardTransparent")}
                      {renderToggle("Sólido (Colisão)", "backboardSolid")}
                      {renderToggle("Gira com Aro", "backboardRotateWithHoop")}
                    </>
                  )}
                </section>
              )}

              {activeTab === "net" && (
                <section className="space-y-6">
                  {renderSelect("Tipo de Rede", "netType", [
                    { value: 'nylon', label: 'Nylon' },
                    { value: 'rope', label: 'Corda' },
                    { value: 'neon', label: 'Neon' },
                    { value: 'chain', label: 'Corrente' },
                    { value: 'metal', label: 'Metal' },
                    { value: 'energy', label: 'Energia' },
                    { value: 'fire', label: 'Fogo' }
                  ])}
                  {renderSlider("Comprimento", "netLength", 20, 150, 5)}
                  {renderSlider("Largura Base", "netWidthBottom", 0, 1.2, 0.05)}
                  {renderSlider("Balanço Natural", "netSwingIntensity", 0, 10, 0.1)}
                  {renderSlider("Resolução", "netResolution", 3, 15, 1)}
                  {renderSlider("Espessura", "netThickness", 0.5, 10, 0.5)}
                  {renderSlider("Rigidez", "netStiffness", 0.1, 1, 0.05)}
                  {renderSlider("Damping", "netDamping", 0.8, 0.99, 0.01)}
                  {renderSlider("Transparência", "netTransparency", 0, 1, 0.1)}
                  {renderSlider("Intensidade Brilho", "netGlowIntensity", 0, 100, 5)}
                </section>
              )}

              {activeTab === "phys" && (
                <section className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 font-bold text-indigo-400">Mecânicas de Combo</h4>
                    {renderToggle("Ativar Combos", "comboEnabled")}
                    {config.comboEnabled && (
                      <>
                        {renderSlider("Janela de Combo", "comboTimeWindow", 500, 10000, 500, "ms")}
                        {renderSlider("Multiplicador Perfect", "perfectMultiplier", 1, 5, 0.1, "x")}
                        {renderSlider("Bônus Fixo Perfect", "perfectBonus", 1, 20, 1)}
                      </>
                    )}
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 font-bold text-indigo-400">Sistema de Pontos</h4>
                    {renderSlider("Toque no Aro", "scoreRimHit", -5, 10, 1)}
                    {renderSlider("Girar no Aro (p/s)", "scoreRimRoll", -10, 20, 1)}
                    {renderSlider("Swish (Limpo)", "scoreSwish", 5, 50, 1)}
                    {renderSlider("Entrar p/ Baixo", "scoreEnterBottom", -50, 0, 1)}
                  </div>
                  {renderToggle("Bounce em Jogadores", "bounceOnPlayers")}
                  {renderToggle("Empurra a Bola", "canPushBall")}
                  {renderSlider("Massa do Aro", "mass", 0.1, 10, 0.1)}
                  {renderSlider("Resistência Ar", "resistance", 0, 1, 0.05)}
                  <div className="h-px bg-white/5 my-4" />
                  {renderToggle("Dificuldade Adaptativa", "adaptiveDifficulty")}
                  {config.adaptiveDifficulty && (
                    <>
                      {renderSlider("Aumento Vel/Tempo", "speedIncreaseOverTime", 0, 2, 0.1)}
                      {renderSlider("Aumento Complex/Tempo", "complexityIncreaseOverTime", 0, 2, 0.1)}
                    </>
                  )}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
              <button
                onClick={() => onChange(DEFAULT_HOOP_CONFIG)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar Tudo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
