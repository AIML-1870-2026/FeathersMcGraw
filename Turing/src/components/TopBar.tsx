import { useSimulation } from '../store/simulation';
import { getEngine } from './Canvas';
import type { ColormapName } from '../types';

const COLORMAPS: ColormapName[] = ['viridis', 'magma', 'inferno', 'plasma', 'grayscale'];

export default function TopBar() {
  const { running, toggleRunning, colormap, setColormap, activeTool, setActiveTool, toggleParams, showParams } = useSimulation();

  return (
    <div className="glass absolute top-0 left-0 right-0 h-12 z-30 flex items-center px-4 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan to-amber opacity-80" />
        <span className="font-semibold text-sm text-white/90">Morphogen</span>
      </div>

      <button
        onClick={() => toggleParams()}
        className="ml-4 px-3 py-1 rounded-md text-xs font-mono text-cyan hover:bg-white/5"
      >
        Gray-Scott {showParams ? '▴' : '▾'}
      </button>

      <div className="flex-1" />

      {/* Tools */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTool('inject')}
          className={`px-2 py-1 rounded text-xs ${activeTool === 'inject' ? 'bg-cyan/20 text-cyan' : 'text-white/50 hover:text-white/70'}`}
        >
          Inject
        </button>
        <button
          onClick={() => setActiveTool('erase')}
          className={`px-2 py-1 rounded text-xs ${activeTool === 'erase' ? 'bg-cyan/20 text-cyan' : 'text-white/50 hover:text-white/70'}`}
        >
          Erase
        </button>
      </div>

      {/* Colormap */}
      <select
        value={colormap}
        onChange={(e) => setColormap(e.target.value as ColormapName)}
        className="bg-chrome/50 border border-glass-border rounded px-2 py-1 text-xs font-mono text-cyan"
      >
        {COLORMAPS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Play/Pause */}
      <button
        onClick={toggleRunning}
        className="px-3 py-1 rounded-md text-xs font-mono hover:bg-white/5"
      >
        {running ? '⏸' : '▶'}
      </button>

      {/* Reset */}
      <button
        onClick={() => getEngine()?.resetState('center')}
        className="px-3 py-1 rounded-md text-xs text-white/50 hover:bg-white/5"
        title="Reset (R)"
      >
        Reset
      </button>
    </div>
  );
}
