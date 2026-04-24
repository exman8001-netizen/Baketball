import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, ShieldCheck, ShieldAlert, Cpu, Sparkles, X, Save } from "lucide-react";
import { setAiConfig, getAiConfig, checkAiConnectivity } from "../services/geminiService";

interface SystemSettingsProps {
  onClose: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ onClose }) => {
  const current = getAiConfig();
  const [apiKey, setApiKey] = useState(current.apiKey);
  const [enabled, setEnabled] = useState(current.enabled);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    if (!apiKey || !enabled) {
      setStatus('idle');
      return;
    }
    setIsTesting(true);
    const ok = await checkAiConnectivity();
    setStatus(ok ? 'success' : 'error');
    setIsTesting(false);
  };

  const handleSave = () => {
    setAiConfig(apiKey, enabled);
    testConnection();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
    >
      <div className="bg-[#0a0a14] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl">
                <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
                <h3 className="font-black uppercase tracking-widest text-white text-sm">System configuration</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Control Protocol & AI Modules</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* AI Toggle */}
          <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-center gap-4">
                <Cpu className={`w-6 h-6 ${enabled ? 'text-indigo-400' : 'text-white/20'}`} />
                <div>
                   <span className="block text-[10px] font-black uppercase tracking-widest text-white/40">AI Generation Engine</span>
                   <span className={`text-xs font-black uppercase tracking-widest ${enabled ? 'text-white' : 'text-white/20'}`}>
                     {enabled ? 'Active' : 'Disabled'}
                   </span>
                </div>
            </div>
            <button 
                onClick={() => setEnabled(!enabled)}
                className={`w-14 h-7 rounded-full transition-all relative ${enabled ? 'bg-indigo-600' : 'bg-white/10'}`}
            >
                <motion.div 
                    animate={{ x: enabled ? 28 : 4 }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                />
            </button>
          </div>

          {/* API Key */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Gemini API Key</label>
                <div className="flex items-center gap-2">
                    {isTesting ? (
                        <div className="w-3 h-3 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                    ) : status === 'success' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" />
                            Connected
                        </div>
                    ) : status === 'error' ? (
                        <div className="flex items-center gap-1.5 text-rose-400 text-[9px] font-black uppercase tracking-widest">
                            <ShieldAlert className="w-3 h-3" />
                            Connection Failed
                        </div>
                    ) : null}
                </div>
             </div>
             <div className="relative">
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API Key..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-xs focus:outline-none focus:border-indigo-500 transition-all text-white placeholder:text-white/10"
                />
                <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/40 pointer-events-none" />
             </div>
             <p className="px-2 text-[9px] text-white/25 leading-relaxed italic">
               Note: The API key is stored locally in your session. It is used for generating unique ball configurations based on player names.
             </p>
          </div>
        </div>

        <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
           <button 
             onClick={handleSave}
             className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl"
           >
             <Save className="w-4 h-4" />
             Apply Changes
           </button>
        </div>
      </div>
    </motion.div>
  );
};
