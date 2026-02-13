import { useCallback } from 'react';
import Canvas, { getEngine } from './components/Canvas';
import TopBar from './components/TopBar';
import ParamPanel from './components/ParamPanel';
import { useSimulation } from './store/simulation';

export default function App() {
  const { toggleRunning, setActiveTool, setBrushRadius } = useSimulation();

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key;
    if (key === ' ') { e.preventDefault(); toggleRunning(); }
    else if (key === '1') setActiveTool('inject');
    else if (key === '2') setActiveTool('erase');
    else if (key === '[') setBrushRadius(useSimulation.getState().brushRadius - 5);
    else if (key === ']') setBrushRadius(useSimulation.getState().brushRadius + 5);
    else if (key.toLowerCase() === 'r') getEngine()?.resetState('center');
    else if (key.toLowerCase() === 'n') getEngine()?.resetState('noise');
  }, [toggleRunning, setActiveTool, setBrushRadius]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: '#0a0e14' }}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <Canvas />
      <TopBar />
      <ParamPanel />
    </div>
  );
}
