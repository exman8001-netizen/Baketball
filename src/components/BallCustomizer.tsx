import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dribbble, 
  Settings2, 
  Palette, 
  Sparkles, 
  Maximize2, 
  Zap, 
  ChevronRight, 
  Dice5,
  CheckCircle2,
  Lock,
  Layers,
  Type
} from "lucide-react";
import { BallConfig, DEFAULT_BALL_CONFIG, BALL_PRESETS } from "../types";
import { BallPreview } from "./BallPreview";
import { generateBallConfigFromAI } from "../services/geminiService";
import { FAMOUS_PLAYERS, NBA_TEAMS } from "../constants";

interface BallCustomizerProps {
  initialConfig?: BallConfig;
  onSave: (config: BallConfig) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'style', label: 'Presets', icon: Dribbble },
  { id: 'attributes', label: 'Atributos', icon: Zap },
  { id: 'size', label: 'Tamanho', icon: Maximize2 },
  { id: 'color', label: 'Cores', icon: Palette },
  { id: 'texture', label: 'Material', icon: Layers },
  { id: 'details', label: 'Detalhes', icon: Type },
  { id: 'effects', label: 'Efeitos', icon: Sparkles },
];

export const BallCustomizer: React.FC<BallCustomizerProps> = ({
  initialConfig = DEFAULT_BALL_CONFIG,
  onSave,
  onClose
}) => {
  const [config, setConfig] = useState<BallConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState('style');
  const [playerName, setPlayerName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<{name: string, symbol: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateConfig = (updates: Partial<BallConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onSave(newConfig); // Auto-save changes as we go for better UX in side-panel
  };

  const handleRandomizeAppearance = () => {
    const styles: BallConfig['style'][] = ['pro', 'street', 'playground', 'vintage', 'futuristic', 'training', 'team'];
    const materials: BallConfig['material'][] = ['leather', 'rubber', 'synthetic', 'chrome', 'lava', 'ice', 'energy', 'metal'];
    const trails: BallConfig['trailType'][] = ['none', 'smoke', 'fire', 'electric', 'neon', 'particles'];
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    updateConfig({
      style: styles[Math.floor(Math.random() * styles.length)],
      material: materials[Math.floor(Math.random() * materials.length)],
      primaryColor: randomHex(),
      lineColor: randomHex(),
      glowColor: randomHex(),
      trailType: trails[Math.floor(Math.random() * trails.length)],
      reflectionIntensity: Math.random(),
    });
  };

  const handleRandomizePhysics = () => {
    updateConfig({
      hp: 50 + Math.floor(Math.random() * 150),
      maxHp: 200,
      energy: 50 + Math.floor(Math.random() * 150),
      maxEnergy: 200,
      energyRechargeSpeed: 1 + Math.floor(Math.random() * 9),
      damage: 1 + Math.floor(Math.random() * 9),
      extraJumps: Math.floor(Math.random() * 4),
      knockbackForce: 1 + Math.random() * 9,
      weight: 1 + Math.random() * 9,
      bounciness: 1 + Math.random() * 9,
      speed: 1 + Math.random() * 9,
      airLevel: 0.7 + Math.random() * 0.3,
    });
  };

  const handleAIGeneration = async (name: string) => {
    if (!name && !playerName) return;
    setIsGenerating(true);
    const targetName = name || playerName;
    try {
      const aiConfig = await generateBallConfigFromAI(
        targetName, 
        selectedTeam?.name, 
        selectedTeam?.symbol
      );
      updateConfig(aiConfig);
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomPlayer = () => {
    const randomPlayer = FAMOUS_PLAYERS[Math.floor(Math.random() * FAMOUS_PLAYERS.length)];
    setPlayerName(randomPlayer);
    handleAIGeneration(randomPlayer);
  };

  const renderAttributeBar = (label: string, value: number, max: number, color: string) => {
    const percent = Math.min(100, (value / max) * 100);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
          <span className="text-white/40">{label}</span>
          <span className="text-white">{value.toFixed(1)} / {max}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className={`h-full ${color}`}
          />
        </div>
      </div>
    );
  };

  const renderAttributeSlider = (label: string, field: keyof BallConfig, min: number, max: number, step: number = 0.1) => {
    const val = config[field] as number;
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
          <span>{label}</span>
          <span className="text-white">{typeof val === 'number' ? val.toFixed(step >= 1 ? 0 : 1) : val}</span>
        </div>
        <input 
          type="range" min={min} max={max} step={step}
          value={val}
          onChange={(e) => updateConfig({ [field]: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'attributes':
        return (
          <div className="space-y-6 pt-2 pb-10">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-5 bg-white/5 p-6 rounded-[2rem] border border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Status de Combate</h4>
                {renderAttributeSlider("HP Máximo", "maxHp", 50, 500, 1)}
                {renderAttributeSlider("Energia Máxima", "maxEnergy", 50, 500, 1)}
                {renderAttributeSlider("Dano de Impacto", "damage", 1, 20, 0.5)}
                {renderAttributeSlider("Recarga de Energia", "energyRechargeSpeed", 1, 20, 0.5)}
                {renderAttributeSlider("Pulos Extras", "extraJumps", 0, 5, 1)}
              </div>
              
              <div className="space-y-5 bg-white/5 p-6 rounded-[2rem] border border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Mecânica Física</h4>
                {renderAttributeSlider("Força de Knockback", "knockbackForce", 1, 15, 0.1)}
                {renderAttributeSlider("Peso / Massa", "weight", 1, 15, 0.1)}
                {renderAttributeSlider("Elasticidade", "bounciness", 1, 15, 0.1)}
                {renderAttributeSlider("Aceleração Max", "speed", 1, 15, 0.1)}
              </div>
            </div>
            
            <button
               onClick={handleRandomizePhysics}
               className="w-full py-4 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600/30 transition-all font-mono"
            >
              <Dice5 className="w-4 h-4" />
              GERAR ESTATÍSTICAS ALEATÓRIAS
            </button>
          </div>
        );

      case 'style':
        return (
          <div className="space-y-6">
            {/* AI Generator Section */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-6 rounded-[2.5rem] border border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.15)]">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">AI Ball Generator</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nome de um jogador famoso..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button 
                    onClick={() => handleAIGeneration(playerName)}
                    disabled={isGenerating || !playerName}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Gerar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleRandomPlayer}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-white/10 flex items-center gap-2"
                  >
                    <Dice5 className="w-3 h-3" />
                    Jogador Aleatório
                  </button>
                  
                  <div className="relative group/players flex-1">
                    <select 
                      onChange={(e) => {
                        const name = e.target.value;
                        if (name) {
                          setPlayerName(name);
                          handleAIGeneration(name);
                        }
                      }}
                      className="w-full h-full bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-white/10 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">Selecionar da Lista</option>
                      {FAMOUS_PLAYERS.map(p => (
                        <option key={p} value={p} className="bg-zinc-900">{p}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white/40 rotate-90" />
                  </div>

                  <div className="relative group/teams flex-1">
                    <select 
                      onChange={(e) => {
                        const teamName = e.target.value;
                        const team = NBA_TEAMS.find(t => t.name === teamName);
                        setSelectedTeam(team || null);
                      }}
                      className="w-full h-full bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-white/10 appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">Time Oficial (Opcional)</option>
                      {NBA_TEAMS.map(t => (
                        <option key={t.name} value={t.name} className="bg-zinc-900">{t.symbol} {t.name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white/40 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(BALL_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => updateConfig({ ...DEFAULT_BALL_CONFIG, ...preset })}
                className={`flex flex-col items-start gap-4 p-5 rounded-3xl border transition-all ${
                  config.style === (preset.style || 'pro') && config.primaryColor === preset.primaryColor
                  ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex w-full justify-between items-center">
                   <div className="scale-[0.4] origin-left -ml-4 -mt-4">
                     <BallPreview config={{ ...DEFAULT_BALL_CONFIG, ...preset } as BallConfig} size={100} rotate={false} />
                   </div>
                   <div className="text-right">
                      <span className="text-[9px] uppercase font-black tracking-widest block">{name}</span>
                      <span className="text-[8px] font-mono text-white/40 block mt-1">HP: {preset.hp}</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full pt-3 border-t border-white/10">
                   <div className="flex justify-between items-center">
                      <span className="text-[7px] text-white/30 lowercase italic">spd</span>
                      <span className="text-[8px] font-black text-indigo-400">{preset.speed}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[7px] text-white/30 lowercase italic">kb</span>
                      <span className="text-[8px] font-black text-rose-400">{preset.knockbackForce}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[7px] text-white/30 lowercase italic">wt</span>
                      <span className="text-[8px] font-black text-zinc-400">{preset.weight}</span>
                   </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        );

      case 'size':
        return (
          <div className="space-y-6 p-2">
            <div className="grid grid-cols-2 gap-3">
              {['mini', 'normal', 'large', 'giant'].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const scales = { mini: 0.6, normal: 1, large: 1.4, giant: 1.8 };
                    updateConfig({ sizePreset: p as any, scale: scales[p as keyof typeof scales] });
                  }}
                  className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                    config.sizePreset === p ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black tracking-widest text-white/50 uppercase">
                <span>Escala Customizada</span>
                <span className="text-indigo-400">{config.scale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="2" step="0.05"
                value={config.scale}
                onChange={(e) => updateConfig({ scale: parseFloat(e.target.value), sizePreset: 'custom' })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        );

      case 'color':
        return (
          <div className="space-y-8 p-2">
            <div className="space-y-4">
              <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Cor Principal</label>
              <div className="grid grid-cols-5 gap-3">
                {['#f97316', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ffffff', '#18181b', '#eab308', '#ec4899', '#6366f1'].map(c => (
                  <button
                    key={c}
                    onClick={() => updateConfig({ primaryColor: c })}
                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${config.primaryColor === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Editor RGB</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="color" 
                  value={config.primaryColor}
                  onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl cursor-pointer p-1"
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Cor das Linhas</label>
              <div className="flex gap-3">
                 {['#000000', '#ffffff', '#7dd3fc', '#f87171'].map(c => (
                   <button
                    key={c}
                    onClick={() => updateConfig({ lineColor: c })}
                    className={`w-8 h-8 rounded-full border ${config.lineColor === c ? 'border-indigo-400 border-2' : 'border-white/10'}`}
                    style={{ backgroundColor: c }}
                   />
                 ))}
              </div>
            </div>
          </div>
        );

      case 'texture':
        return (
          <div className="grid grid-cols-2 gap-3">
            {['leather', 'rubber', 'synthetic', 'chrome', 'lava', 'ice', 'energy', 'metal'].map(m => (
              <button
                key={m}
                onClick={() => updateConfig({ material: m as any })}
                className={`py-4 px-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  config.material === m ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {m}
              </button>
            ))}
            <div className="col-span-2 space-y-4 mt-6">
               <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black tracking-widest text-white/50 uppercase">
                  <span>Reflexo Metálico</span>
                  <span className="text-indigo-400">{Math.round(config.reflectionIntensity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={config.reflectionIntensity}
                  onChange={(e) => updateConfig({ reflectionIntensity: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8 p-2">
            <div className="space-y-3">
               <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Tag / Marca</label>
               <input 
                type="text"
                value={config.printText}
                onChange={(e) => updateConfig({ printText: e.target.value.slice(0, 8) })}
                placeholder="NOME..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm uppercase text-indigo-100"
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Número (#)</label>
                <input 
                  type="text"
                  value={config.printedNumber}
                  onChange={(e) => updateConfig({ printedNumber: e.target.value.slice(0, 2) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm uppercase text-indigo-100 text-center"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Glow Seams</label>
                <button
                  onClick={() => updateConfig({ showGlow: !config.showGlow })}
                  className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                    config.showGlow ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {config.showGlow ? 'ATIVO' : 'INATIVO'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'effects':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Rastro (Trail)</label>
              <div className="grid grid-cols-2 gap-3">
                {['none', 'smoke', 'fire', 'electric', 'neon', 'particles'].map(t => (
                  <button
                    key={t}
                    onClick={() => updateConfig({ trailType: t as any })}
                    className={`py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      config.trailType === t ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black tracking-widest text-white/50 uppercase">Aura Lendária</label>
               <div className="flex gap-3">
                  {['none', 'legendary', 'shadow'].map(a => (
                    <button
                      key={a}
                      onClick={() => updateConfig({ auraType: a as any })}
                      className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                        config.auraType === a ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="relative w-full max-w-4xl h-full bg-white/[0.03] border-l border-white/10 backdrop-blur-3xl overflow-hidden flex flex-col shadow-[-20px_0_100px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-col h-full lg:flex-row">
        {/* Left Side: Preview (3D Viewport) */}
        <div className="w-full lg:w-2/5 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_50%_50%,_rgba(67,56,202,0.1),_transparent_70%)] border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
          <div className="absolute top-8 left-8 flex flex-col gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] w-fit border ${
               config.rarity === 'legendary' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
               config.rarity === 'epic' ? 'bg-purple-500/20 border-purple-500/40 text-purple-500' :
               config.rarity === 'rare' ? 'bg-blue-500/20 border-blue-500/40 text-blue-500' :
               'bg-white/5 border-white/10 text-white/40'
            }`}>
              {config.rarity}
            </span>
            <span className="text-[10px] font-mono text-white/20">PROTO_BALL_ID: {Math.floor(Math.random()*10000)}</span>
          </div>

          <div className="relative group">
            <BallPreview config={config} size={220} />
            
            {/* Holographic Overlays */}
            <div className="absolute -inset-10 pointer-events-none opacity-20">
               <div className="absolute inset-0 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
               <div className="absolute inset-4 border border-indigo-400/20 rounded-full animate-[spin_7s_linear_infinite_reverse]" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 w-full px-4">
            <div className="flex gap-2">
              <button
                 onClick={handleRandomizeAppearance}
                 className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 flex flex-col items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                <Palette className="w-3 h-3 mb-1" />
                Visual
              </button>
              <button
                 onClick={handleRandomizePhysics}
                 className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 flex flex-col items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="w-3 h-3 mb-1" />
                Mecânica
              </button>
            </div>
            <button
               onClick={() => { handleRandomizeAppearance(); handleRandomizePhysics(); }}
               className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 rounded-2xl py-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Dice5 className="w-4 h-4" />
              Random Total
            </button>
          </div>
        </div>

        {/* Right Side: Navigation & Editing */}
        <div className="flex-1 flex flex-col bg-black/20">
          {/* Header Tabs */}
          <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex-1 min-w-[70px] py-6 flex flex-col items-center gap-2 transition-all relative ${
                  activeTab === cat.id ? 'text-indigo-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest">{cat.label}</span>
                {activeTab === cat.id && (
                  <motion.div 
                    layoutId="tab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions (Optional in side panel, but keeping for clear confirmation) */}
          <div className="p-6 border-t border-white/10 bg-black/40 flex flex-col gap-3">
             <button
              onClick={() => {
                onSave(config);
                onClose();
              }}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
             >
               Salvar e Fechar
               <CheckCircle2 className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
