import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, HardDrive, RotateCcw, Server, Settings2, Trash2, 
  ShieldCheck, Zap, Music, SkipBack, XCircle, GripVertical, 
  Save, FolderOpen, Plus, Play, Pause 
} from 'lucide-react';
import { 
  getStatus, cleanAudioCache, setSessionRestore, summonBot, 
  getCurrentSong, getLyrics, reorderQueue, removeTrack, 
  playPrevious, savePreset, getPresets, loadPreset 
} from './lib/voxaria-api';

function App() {
  const queryClient = useQueryClient();
  
  // --- STATE ---
  const [manualOffset, setManualOffset] = useState(3.0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // --- REFS (High-Frequency Logic) ---
  const smoothTimeRef = useRef(0);
  const currentTimeTextRef = useRef<HTMLDivElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const lastFrameRef = useRef(0);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  
  const correctionRef = useRef({ start: 0, from: 0, to: 0, end: 0 });

  const CORRECTION_DURATION_MS = 1000; 
  const SOFT_SNAP_THRESHOLD_MS = 250; 

  // --- QUERIES ---
  const { data: status } = useQuery({
    queryKey: ['botStatus'],
    queryFn: getStatus,
    refetchInterval: 5000,
  });

  const { data: currentSong } = useQuery({
    queryKey: ['currentSong'],
    queryFn: async () => {
      const data = await getCurrentSong();
      if (data.startTime !== undefined) setStartTime(data.startTime);
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      return data;
    },
    refetchInterval: 2000, 
    enabled: status?.online,
  });

  const { data: lyrics } = useQuery({
    queryKey: ['lyrics', currentSong?.title, currentSong?.artist],
    queryFn: () => getLyrics(currentSong!.title, currentSong!.artist),
    enabled: !!currentSong?.title && !!currentSong?.artist,
  });

  const { data: presets } = useQuery({
    queryKey: ['presets'],
    queryFn: getPresets,
    refetchInterval: 10000,
    enabled: status?.online,
  });

  // --- MUTATIONS (Backend Sync) ---
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['currentSong'] });

  const prevMutation = useMutation({ mutationFn: playPrevious, onSuccess: refresh });
  const removeMutation = useMutation({ mutationFn: (idx: number) => removeTrack(idx), onSuccess: refresh });
  const reorderMutation = useMutation({ 
    mutationFn: ({oldIdx, newIdx}: {oldIdx: number, newIdx: number}) => reorderQueue(oldIdx, newIdx),
    onSuccess: refresh 
  });
  const savePresetMutation = useMutation({ 
    mutationFn: (name: string) => savePreset(name), 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['presets'] }) 
  });
  const loadPresetMutation = useMutation({ mutationFn: (name: string) => loadPreset(name), onSuccess: refresh });
  const cleanCacheMutation = useMutation({ mutationFn: cleanAudioCache, onSuccess: () => alert('Cache Purged! 🧹') });
  const summonMutation = useMutation({ mutationFn: summonBot, onSuccess: () => alert('Bot Summoned! 🤖') });

  // Sync refs with state
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // --- 60FPS ANIMATION LOOP ---
  useEffect(() => {
    const animate = () => {
      // If paused or no song, don't advance the clock
      if (!isPlayingRef.current || startTimeRef.current === null) {
        lastFrameRef.current = performance.now();
        requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const absoluteElapsed = Date.now() - startTimeRef.current;
      
      const corr = correctionRef.current;
      let activeOffset = offsetRef.current;
      
      if (now < corr.end) {
        const progress = (now - corr.start) / CORRECTION_DURATION_MS;
        activeOffset = corr.from + (corr.to - corr.from) * progress;
      } else if (corr.end !== 0) {
        activeOffset = corr.to;
        offsetRef.current = corr.to;
        correctionRef.current.end = 0;
      }

      const totalSmoothTime = absoluteElapsed + activeOffset;
      smoothTimeRef.current = totalSmoothTime;

      // Direct DOM Updates for Performance
      if (currentTimeTextRef.current) {
        currentTimeTextRef.current.textContent = `${Math.floor(totalSmoothTime / 1000)}s`;
      }

      if (lyricsContainerRef.current) {
        const adjustedTimeSec = (totalSmoothTime / 1000) - manualOffset;
        const nodes = lyricsContainerRef.current.querySelectorAll<HTMLDivElement>('[data-lyric-time]');
        
        nodes.forEach((node) => {
          const lineTime = Number(node.dataset.lyricTime);
          // 3 second window for the highlight to stay active
          const isActive = adjustedTimeSec >= lineTime && (adjustedTimeSec < (lineTime + 3));
          
          node.classList.toggle('bg-neonGreen/10', isActive);
          node.classList.toggle('text-neonGreen', isActive);
          node.classList.toggle('scale-105', isActive);
          node.classList.toggle('shadow-[0_0_25px_rgba(57,255,20,0.15)]', isActive);
          node.classList.toggle('border-neonGreen/30', isActive);
        });
      }

      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [manualOffset]);

  // --- SOFT SYNC LOGIC ---
  useEffect(() => {
    if (!isPlaying || startTime === null || currentSong?.currentTime === undefined) return;

    const botTimeMs = currentSong.currentTime * 1000;
    const localTimeMs = Date.now() - startTime;
    const targetOffset = botTimeMs - localTimeMs;
    const currentOffset = offsetRef.current;
    const error = targetOffset - currentOffset;

    if (Math.abs(error) > SOFT_SNAP_THRESHOLD_MS) {
      const now = performance.now();
      correctionRef.current = {
        start: now,
        from: currentOffset,
        to: targetOffset,
        end: now + CORRECTION_DURATION_MS,
      };
    }
  }, [currentSong?.currentTime, isPlaying, startTime]);

  // --- DRAG & DROP HANDLERS ---
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (newIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== newIndex) {
      reorderMutation.mutate({ oldIdx: draggedIndex, newIdx: newIndex });
    }
    setDraggedIndex(null);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8 bg-[#080808] text-white font-sans selection:bg-neonGreen selection:text-black">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-neonGreen/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <header className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neonGreen to-emerald-600 p-[1px]">
            <div className="w-full h-full rounded-2xl bg-[#080808] flex items-center justify-center">
              <Zap className="text-neonGreen w-6 h-6 fill-neonGreen/20" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">VOXTARIA<span className="text-neonGreen">.</span></h1>
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${status?.online ? 'bg-neonGreen' : 'bg-red-500'}`} />
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                 {status?.online ? `Online • ${status.pingMs}ms` : 'System Offline'}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => summonMutation.mutate()} className="glass-panel px-4 py-2 text-xs font-bold hover:text-neonGreen transition-colors border border-white/5">
            SUMMON
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column: Navigation & Presets (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <section className="glass-panel p-5 space-y-4 border-t-2 border-neonGreen/20">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5" /> Saved Presets
            </h2>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {presets?.map((p: any) => (
                <button 
                  key={p.name}
                  onClick={() => loadPresetMutation.mutate(p.name)}
                  className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-neonGreen/10 group transition-all flex justify-between items-center"
                >
                  <span className="text-sm font-medium group-hover:text-neonGreen">{p.name}</span>
                  <span className="text-[10px] text-gray-600">{p.count} tracks</span>
                </button>
              ))}
              {!presets?.length && <div className="text-[10px] text-gray-600 italic">No presets saved yet.</div>}
            </div>
            <button 
              onClick={() => {
                const name = prompt("Enter preset name:");
                if (name) savePresetMutation.mutate(name);
              }}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save Current Queue
            </button>
          </section>

          <section className="glass-panel p-5 space-y-4">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" /> Hardware
            </h2>
            <button onClick={() => cleanCacheMutation.mutate()} className="w-full py-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all">
              Purge Audio Cache
            </button>
          </section>
        </div>

        {/* Middle Column: Lyrics & Main Player (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-8 flex flex-col gap-8 min-h-[650px] border-t-2 border-neonGreen">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight leading-tight">
                  {currentSong?.title ?? "System Idle"}
                </h2>
                <p className="text-neonGreen font-medium tracking-wide">
                  {currentSong?.artist ?? "Ready for input..."}
                </p>
              </div>
              <div ref={currentTimeTextRef} className="text-5xl font-black text-white/5 select-none italic">
                0s
              </div>
            </div>

            {/* Sync Controls */}
            <div className="bg-white/[0.03] p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <span>Latency Compensation</span>
                <span className="text-neonGreen">{manualOffset.toFixed(1)}s Delay</span>
              </div>
              <input
                type="range" min="-2" max="10" step="0.1" value={manualOffset}
                onChange={(e) => setManualOffset(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neonGreen"
              />
            </div>

            {/* Lyrics Container */}
            <div 
              ref={lyricsContainerRef}
              className="flex-grow overflow-y-auto overflow-x-hidden py-4 space-y-3 pr-2 custom-scrollbar mask-fade-edges"
            >
              {lyrics ? lyrics.map((line: any, idx: number) => (
                <div 
                  key={idx}
                  data-lyric-time={line.time}
                  className="w-[90%] mx-auto py-3 px-6 rounded-2xl text-xl md:text-2xl font-bold text-gray-600 transition-all duration-500 hover:text-gray-400 text-center select-none border border-transparent origin-center"
                >
                  {line.text}
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-gray-700 text-sm italic">
                  Awaiting audio signal for lyric synchronization...
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-center gap-8 pt-4 border-t border-white/5">
              <button onClick={() => prevMutation.mutate()} className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                <SkipBack className="w-6 h-6" />
              </button>
              <div className="w-16 h-16 rounded-full bg-neonGreen flex items-center justify-center text-black shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black" />}
              </div>
              <button className="p-4 rounded-full bg-white/5 text-gray-800 cursor-not-allowed">
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Queue (3 cols) */}
        <div className="lg:col-span-3">
          <div className="glass-panel p-5 flex flex-col gap-4 h-full border-t-2 border-purple-500/30">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Music className="w-3.5 h-3.5" /> Active Queue
            </h2>
            <div className="space-y-2 flex-grow overflow-y-auto pr-1 custom-scrollbar">
              {currentSong?.queue?.map((track: any, idx: number) => (
                <div 
                  key={`${track.id}-${idx}`}
                  draggable
                  onDragStart={() => setDraggedIndex(idx)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(idx)}
                  className={`group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-grab active:cursor-grabbing hover:border-neonGreen/20 transition-all ${draggedIndex === idx ? 'opacity-20' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="text-[11px] font-bold truncate group-hover:text-neonGreen transition-colors">{track.title}</div>
                    <div className="text-[9px] text-gray-600 truncate uppercase tracking-tighter">{track.artist}</div>
                  </div>
                  <button 
                    onClick={() => removeMutation.mutate(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-500 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!currentSong?.queue?.length && (
                <div className="text-center py-12 text-gray-700 text-xs italic">Queue is empty</div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;