import React, { useState } from "react";
import { motion } from "motion/react";
import { X, User, Heart, Shield, Star, Save } from "lucide-react";

interface ProfileEditorProps {
  initialStats: any;
  onSave: (stats: any) => void;
  onClose: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ initialStats, onSave, onClose }) => {
  const [data, setData] = useState(initialStats || {
    bio: "Explorando os céus...",
    favoriteTeam: "Time Estelar",
    favoritePlayer: "O Mestre"
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a14] border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Perfil</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/40" />
            </button>
        </div>

        <div className="space-y-6">
            <div>
                <label className="block text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-2 opacity-80 flex items-center gap-2">
                    <User className="w-3 h-3" /> Bio / Status
                </label>
                <textarea 
                    value={data.bio}
                    onChange={(e) => setData({ ...data, bio: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none h-24"
                    placeholder="Sua frase de impacto..."
                />
            </div>

            <div>
                <label className="block text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-2 opacity-80 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Time Favorito
                </label>
                <input 
                    type="text"
                    value={data.favoriteTeam}
                    onChange={(e) => setData({ ...data, favoriteTeam: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                    placeholder="Nome do time..."
                />
            </div>

            <div>
                <label className="block text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-2 opacity-80 flex items-center gap-2">
                    <Star className="w-3 h-3" /> Jogador Favorito
                </label>
                <input 
                    type="text"
                    value={data.favoritePlayer}
                    onChange={(e) => setData({ ...data, favoritePlayer: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                    placeholder="Ex: Michael Jordan..."
                />
            </div>

            <button 
                onClick={() => {
                    onSave(data);
                    onClose();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95"
            >
                <Save className="w-4 h-4" />
                Salvar Alterações
            </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
