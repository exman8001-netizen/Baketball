import React from "react";
import { PhysicsConfig, PHYSICS_PRESETS } from "../types";
import { Settings, X, RotateCcw, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsPanelProps {
  config: PhysicsConfig;
  onChange: (config: PhysicsConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onChange, isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = React.useState<string>("aim");

  const handleInputChange = (key: keyof PhysicsConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const renderSlider = (label: string, key: keyof PhysicsConfig, min: number, max: number, step: number) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter">
        <span className="text-indigo-300/60">{label}</span>
        <span className="text-indigo-400">{(config[key] as number).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={config[key] as number}
        onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
      />
    </div>
  );

  const renderToggle = (label: string, key: keyof PhysicsConfig) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300/60">{label}</span>
      <button
        onClick={() => handleInputChange(key, !config[key])}
        className={`w-8 h-4 rounded-full transition-all relative ${config[key] ? 'bg-indigo-500' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config[key] ? 'left-4.5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  const tabs = [
    { id: "aim", label: "Mira" },
    { id: "move", label: "Mov" },
    { id: "rim", label: "Aro" },
    { id: "board", label: "Quadro" },
    { id: "visual", label: "Visual" }
  ];

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-8 right-8 z-50 p-4 bg-indigo-600 rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:scale-110 active:scale-95 transition-all text-white group"
      >
        <Settings className={`w-6 h-6 ${isOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 z-50 w-80 max-h-[85vh] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-white">Laboratório Físico</h3>
              </div>
              <button onClick={onToggle} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex p-2 bg-white/5 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PHYSICS_PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => onChange(PHYSICS_PRESETS[name])}
                    className="p-2 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 rounded-xl transition-all text-[9px] font-black uppercase tracking-tighter text-left"
                  >
                    {name}
                  </button>
                ))}
              </div>

              {activeTab === "aim" && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Modo e Mira</h4>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['jump', 'throw', 'mixed'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handleInputChange('gameplayMode', mode)}
                        className={`p-2 border rounded-xl transition-all text-[9px] font-bold uppercase tracking-tighter ${
                          config.gameplayMode === mode ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-indigo-200'
                        }`}
                      >
                        {mode === 'jump' ? 'Arcade' : mode === 'throw' ? 'Skill' : 'Mixed'}
                      </button>
                    ))}
                  </div>
                  {renderSlider("Sensibilidade", "aimSensitivity", 0.5, 3, 0.1)}
                  {renderSlider("Força Máxima", "maxShootPower", 10, 60, 1)}
                  {renderSlider("Vel. Carga", "chargeSpeed", 0.1, 3, 0.1)}
                  {renderToggle("Guia de Mira", "showTrajectoryLine")}
                  {renderToggle("Auto Reset", "autoResetAfterThrow")}
                </section>
              )}

              {activeTab === "move" && (
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Dinâmica</h4>
                   {renderSlider("Peso Bola", "ballWeight", 0.1, 5, 0.1)}
                   {renderSlider("Gravidade", "gravity", 0.01, 2, 0.01)}
                   {renderSlider("Atrito Chão", "groundFriction", 0.1, 1, 0.01)}
                   {renderSlider("Elasticidade Base", "elasticity", 0.1, 2, 0.1)}
                   {renderSlider("Bounce Chão", "floorBounceHeight", 0.1, 1.5, 0.1)}
                </section>
              )}

              {activeTab === "rim" && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Metal & Atrito</h4>
                  {renderSlider("Bounce Aro", "rimBounce", 0.1, 1.5, 0.1)}
                  {renderSlider("Elasticidade", "rimElasticity", 0.1, 1, 0.05)}
                  {renderSlider("Atrito Metal", "rimFriction", 0, 1, 0.05)}
                  {renderSlider("Chance Escorregar", "rimSlipChance", 0, 1, 0.05)}
                  <div className="h-px bg-white/5 my-4" />
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Rim Roll (Giro)</h4>
                  {renderToggle("Ativar Rim Roll", "rimRollEnabled")}
                  {renderSlider("Tempo Máx (ms)", "rimRollMaxTime", 500, 5000, 100)}
                  {renderSlider("Vel. Giro", "rimRollRotationSpeed", 0.01, 0.5, 0.01)}
                  {renderSlider("Chance Entrar", "rimRollChanceToEnter", 0, 1, 0.05)}
                </section>
              )}

              {activeTab === "board" && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Impacto Quadro</h4>
                  {renderSlider("Força Rebote", "backboardBounce", 0.1, 2, 0.1)}
                  {renderSlider("Elasticidade", "backboardElasticity", 0.1, 1, 0.05)}
                  {renderSlider("Perda Energia", "backboardEnergyLoss", 0, 1, 0.05)}
                  <div className="h-px bg-white/5 my-4" />
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Trickshot Assist</h4>
                  {renderSlider("Assistência", "backboardAssist", 0, 1, 0.05)}
                </section>
              )}

              {activeTab === "visual" && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Reação Física Visual</h4>
                  {renderSlider("Vibração Aro", "hoopVibrationIntensity", 0, 50, 1)}
                  {renderSlider("Inclinação Aro", "hoopTiltStrength", 0, 50, 1)}
                  {renderSlider("Recuperação", "hoopElasticRecovery", 0.01, 0.5, 0.01)}
                  <div className="h-px bg-white/5 my-4" />
                  {renderToggle("Squash & Stretch", "squashStretchEnabled")}
                  {renderSlider("Impact Shake", "impactShake", 0, 30, 1)}
                </section>
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5">
              <button
                onClick={() => onChange(PHYSICS_PRESETS["Arcade Leve"])}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200"
              >
                <RotateCcw className="w-3 h-3" />
                Resetar Laboratório
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
