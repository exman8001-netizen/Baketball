import React from "react";
import { motion } from "motion/react";
import { Trophy, Target, Skull, Crown } from "lucide-react";
import { Player } from "../types";
import { BallPreview } from "./BallPreview";

interface RankingOverlayProps {
  players: Record<string, Player>;
  myId: string;
  onPlayerClick: (player: Player) => void;
}

export const RankingOverlay: React.FC<RankingOverlayProps> = ({ players, myId, onPlayerClick }) => {
  const sortedPlayers = (Object.values(players) as Player[])
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  return (
    <div className="absolute top-6 left-6 z-[100] flex flex-col gap-4 pointer-events-none">
      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">
          Sky <span className="text-indigo-400">Ranking</span>
        </span>
      </div>

      <div className="space-y-2 pointer-events-auto">
        {sortedPlayers.map((player, index) => (
          <motion.button
            key={player.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onPlayerClick(player)}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group hover:scale-105 active:scale-95 ${
              player.id === myId 
                ? 'bg-indigo-600/20 border-indigo-500/40 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                : 'bg-black/40 border-white/5 hover:border-white/20'
            }`}
          >
            {/* Rank Number */}
            <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black italic ${
                index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' :
                index === 1 ? 'bg-zinc-300 text-black shadow-lg shadow-zinc-300/30' :
                index === 2 ? 'bg-orange-400 text-black shadow-lg shadow-orange-400/30' :
                'bg-white/10 text-white'
            }`}>
                {index + 1}
            </div>

            {/* Ball Preview Avatar */}
            <div className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 shadow-inner">
                <BallPreview config={player.ballConfig} size={32} />
            </div>

            {/* Player Name and Level */}
            <div className="flex-1 min-w-[120px]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-white tracking-widest truncate max-w-[100px]">
                        {player.name}
                    </span>
                    {index === 0 && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                </div>
                <div className="flex gap-3 text-[8px] font-black uppercase tracking-widest text-white/40">
                  <span className="text-indigo-400">LV {player.level || player.ballConfig.level || 1}</span>
                  <span className="flex items-center gap-1"><Skull className="w-2 h-2" /> {player.kills || 0}</span>
                  <span className="flex items-center gap-1"><Target className="w-2 h-2" /> {player.baskets || 0}</span>
                </div>
            </div>

            {/* Score */}
            <div className="text-right pl-4">
                <span className="block text-[8px] uppercase font-black text-white/20 tracking-widest mb-0.5">PTS</span>
                <span className={`text-sm font-black italic ${player.id === myId ? 'text-indigo-400' : 'text-white'}`}>
                    {Math.round(player.score || 0)}
                </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
