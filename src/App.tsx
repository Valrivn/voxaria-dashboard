import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Activity, HardDrive, RotateCcw, Server, Settings2, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { getStatus, cleanAudioCache, setSessionRestore } from './lib/voxaria-api';

function App() {
  const [sessionRestore, setSessionRestoreState] = useState(true);

  const { data: status, isLoading } = useQuery({
    queryKey: ['botStatus'],
    queryFn: getStatus,
    refetchInterval: 5000,
  });

  const cleanCacheMutation = useMutation({
    mutationFn: cleanAudioCache,
    onSuccess: () => {
      alert('Audio cache cleaned successfully! 🎵✨');
    },
    onError: (error: Error) => {
      alert(`Failed to clean cache: ${error.message}`);
    }
  });

  const toggleSessionRestoreMutation = useMutation({
    mutationFn: setSessionRestore,
    onSuccess: (_, variables) => {
      setSessionRestoreState(variables);
    },
    onError: (error: Error) => {
      alert(`Failed to toggle session restore: ${error.message}`);
    }
  });

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-neonGreen/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-neonGreen/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surfaceHighlight flex items-center justify-center neon-glow">
            <Zap className="text-neonGreen w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voxtaria<span className="text-neonGreen">.</span></h1>
            <p className="text-sm text-gray-400">Advanced Bot Control Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 glass-panel px-4 py-2">
          <div className={`w-3 h-3 rounded-full ${status?.online ? 'bg-neonGreen animate-pulse shadow-[0_0_10px_#39ff14]' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">{status?.online ? 'System Online' : 'Connecting...'}</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 flex-grow">
        
        {/* Status Card */}
        <div className="glass-panel p-6 flex flex-col gap-6 transform transition-transform hover:scale-[1.02] duration-300">
          <div className="flex items-center gap-3 border-b border-surfaceHighlight pb-4">
            <Activity className="text-neonGreen w-5 h-5" />
            <h2 className="text-lg font-semibold">Real-time Status</h2>
          </div>
          
          <div className="flex-grow flex flex-col justify-center gap-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2"><Server className="w-4 h-4"/> Active Shard</span>
              <span className="text-xl font-mono">{isLoading ? '--' : status?.activeShard ?? 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2"><Activity className="w-4 h-4"/> Latency</span>
              <span className="text-xl font-mono text-neonGreen">{isLoading ? '--' : `${status?.pingMs ?? 0}ms`}</span>
            </div>
          </div>
        </div>

        {/* Cache Management */}
        <div className="glass-panel p-6 flex flex-col gap-6 transform transition-transform hover:scale-[1.02] duration-300">
          <div className="flex items-center gap-3 border-b border-surfaceHighlight pb-4">
            <HardDrive className="text-neonGreen w-5 h-5" />
            <h2 className="text-lg font-semibold">Storage & Cache</h2>
          </div>
          
          <p className="text-sm text-gray-400 flex-grow">
            Clear temporary audio files and free up disk space. Protected files will be preserved automatically.
          </p>

          <button 
            onClick={() => cleanCacheMutation.mutate()}
            disabled={cleanCacheMutation.isPending}
            className="w-full py-3 px-4 rounded-xl bg-surfaceHighlight hover:bg-neonGreen hover:text-black border border-neonGreen/20 transition-all duration-300 flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {cleanCacheMutation.isPending ? (
              <RotateCcw className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            {cleanCacheMutation.isPending ? 'Cleaning...' : 'Purge Audio Cache'}
          </button>
        </div>

        {/* Settings */}
        <div className="glass-panel p-6 flex flex-col gap-6 transform transition-transform hover:scale-[1.02] duration-300">
          <div className="flex items-center gap-3 border-b border-surfaceHighlight pb-4">
            <Settings2 className="text-neonGreen w-5 h-5" />
            <h2 className="text-lg font-semibold">System Preferences</h2>
          </div>
          
          <div className="flex-grow flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight/50 border border-surfaceHighlight">
              <div className="flex flex-col gap-1">
                <span className="font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neonGreen" /> Session Restore
                </span>
                <span className="text-xs text-gray-400">Save queue states on restart</span>
              </div>
              
              <button 
                onClick={() => toggleSessionRestoreMutation.mutate(!sessionRestore)}
                disabled={toggleSessionRestoreMutation.isPending}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${sessionRestore ? 'bg-neonGreen/20 border border-neonGreen' : 'bg-surfaceHighlight border border-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-transform duration-300 ${sessionRestore ? 'translate-x-6 bg-neonGreen neon-glow' : 'translate-x-0 bg-gray-400'}`} />
              </button>
            </div>
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500 relative z-10">
        <p>© {new Date().getFullYear()} Voxtaria. Powered by advanced audio rendering.</p>
      </footer>
    </div>
  );
}

export default App;
