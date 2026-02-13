import { useSimulation, MODEL_CONFIGS } from '../store/simulation';

export default function ParamPanel() {
  const { model, params, showParams, setParam, stepsPerFrame, setStepsPerFrame } = useSimulation();

  if (!showParams) return null;

  const config = MODEL_CONFIGS[model];
  const currentParams = params[model];

  return (
    <div className="glass absolute top-12 left-0 right-0 z-20 overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
        {config.paramDefs.map((def) => (
          <div key={def.key} className="flex items-center gap-2 min-w-[220px]">
            <label className="text-xs font-mono text-white/50 w-24 shrink-0">{def.label}</label>
            <input
              type="range"
              min={def.min}
              max={def.max}
              step={def.step}
              value={currentParams[def.key] ?? def.default}
              onChange={(e) => setParam(def.key, parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-14 text-xs font-mono text-cyan text-right">
              {(currentParams[def.key] ?? def.default).toFixed(3)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 min-w-[220px]">
          <label className="text-xs font-mono text-white/50 w-24 shrink-0">Steps/Frame</label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={stepsPerFrame}
            onChange={(e) => setStepsPerFrame(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-14 text-xs font-mono text-cyan text-right">{stepsPerFrame}</span>
        </div>
      </div>
    </div>
  );
}
