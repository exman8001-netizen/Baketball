import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Trophy, Zap, Target, Skull, Clock, Shield, Star, Users, Flame } from "lucide-react";
import { Player, BallConfig } from "../types";
import { BallPreview } from "./BallPreview";

interface UserProfileModalProps {
  player: Player;
  onClose: () => void;
  onLike: (playerId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ player, onClose, onLike }) => {
  const stats = player.stats || {
    totalKills: 0,
    totalDeaths: 0,
    totalBaskets: 0,
    totalScore: 0,
    matchesWon: 0,
    matchesPlayed: 0,
    playtimeHours: 0,
    likes: 0,
    bio: "Explorando os céus...",
    favoriteTeam: "Nenhum",
    favoritePlayer: "Nenhum"
  };

  const winRate = stats.matchesPlayed > 0 
    ? (stats.matchesWon / stats.matchesPlayed * 100).toFixed(1) 
    : "0";
  
  const kdRatio = stats.totalDeaths > 0 
    ? (stats.totalKills / stats.totalDeaths).toFixed(2) 
    : stats.totalKills.toFixed(2);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0a0a14] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 flex flex-wrap gap-4 p-4 pointer-events-none">
                {[...Array(10)].map((_, i) => (
                    <Trophy key={i} className="w-8 h-8 rotate-12" />
                ))}
            </div>
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/60 hover:text-white transition-all z-10"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Profile Content */}
        <div className="px-10 pb-10 -mt-16 relative">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar / Ball */}
                <div className="relative">
                    <div className="p-6 bg-[#0a0a14] rounded-[2.5rem] border border-white/10 shadow-2xl">
                        <BallPreview config={player.ballConfig} size={140} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-indigo-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-indigo-400">
                        LVL {player.level || player.ballConfig.level || 1}
                    </div>
                </div>

                {/* Main Info */}
                <div className="flex-1 pt-12 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                                {player.name}
                            </h2>
                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-60">
                                PILOTO RANKED • {player.id.slice(0, 8)}
                            </p>
                        </div>
                        <button 
                            onClick={() => onLike(player.id)}
                            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-2 rounded-2xl transition-all border border-rose-500/20"
                        >
                            <Heart className="w-4 h-4 fill-current" />
                            <span className="font-black text-xs">{stats.likes}</span>
                        </button>
                    </div>

                    <p className="text-white/40 text-xs italic leading-relaxed">
                        "{stats.bio}"
                    </p>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <div>
                                <span className="block text-[8px] uppercase font-black text-white/30 tracking-widest">Time Favorito</span>
                                <span className="block text-[10px] uppercase font-black text-white">{stats.favoriteTeam}</span>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <div>
                                <span className="block text-[8px] uppercase font-black text-white/30 tracking-widest">Ídolo</span>
                                <span className="block text-[10px] uppercase font-black text-white">{stats.favoritePlayer}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/5">
                <StatCard label="Total Kills" value={stats.totalKills} icon={<Skull className="w-4 h-4" />} color="text-rose-400" />
                <StatCard label="Cestas" value={stats.totalBaskets} icon={<Target className="w-4 h-4" />} color="text-emerald-400" />
                <StatCard label="Win Rate" value={`${winRate}%`} icon={<Zap className="w-4 h-4" />} color="text-indigo-400" />
                <StatCard label="K/D Ratio" value={kdRatio} icon={<Flame className="w-4 h-4" />} color="text-amber-400" />
                
                <StatCard label="Placar Geral" value={Math.round(stats.totalScore)} icon={<Trophy className="w-4 h-4" />} color="text-yellow-500" />
                <StatCard label="Derrotas" value={stats.totalDeaths} icon={<X className="w-4 h-4" />} color="text-red-500" />
                <StatCard label="Partidas" value={stats.matchesPlayed} icon={<Users className="w-4 h-4" />} color="text-zinc-400" />
                <StatCard label="Horas de Voo" value={stats.playtimeHours} icon={<Clock className="w-4 h-4" />} color="text-sky-400" />
            </div>

            <div className="mt-10 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/50">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest">Desempenho Geral</span>
                        <span className="block text-sm font-black text-white uppercase italic">Elite Sky Pilot Status</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] font-black uppercase text-white/30 tracking-widest">Ratio</span>
                    <span className="text-xl font-black text-white">1:{kdRatio}</span>
                </div>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
        <div className={`p-2 bg-black/40 rounded-xl w-fit ${color}`}>
            {icon}
        </div>
        <div>
            <span className="block text-[8px] uppercase font-black text-white/20 tracking-[0.2em]">{label}</span>
            <span className="text-lg font-black text-white leading-none">{value}</span>
        </div>
    </div>
);
