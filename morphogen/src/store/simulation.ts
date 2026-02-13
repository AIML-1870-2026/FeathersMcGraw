import { create } from 'zustand';
import type { ModelType, ToolType, ColormapName, InitialCondition, ModelConfig, ModelParams } from '../types';

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  'gray-scott': {
    id: 'gray-scott',
    name: 'Gray-Scott',
    paramDefs: [
      { key: 'F', label: 'Feed (F)', min: 0.01, max: 0.1, step: 0.001, default: 0.037 },
      { key: 'k', label: 'Kill (k)', min: 0.03, max: 0.07, step: 0.001, default: 0.06 },
      { key: 'Du', label: 'Diffusion U', min: 0.05, max: 0.4, step: 0.005, default: 0.21 },
      { key: 'Dv', label: 'Diffusion V', min: 0.02, max: 0.2, step: 0.005, default: 0.105 },
      { key: 'dt', label: 'Time Step', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
    ],
    defaults: { F: 0.037, k: 0.06, Du: 0.21, Dv: 0.105, dt: 1.0 },
  },
};

interface SimulationStore {
  model: ModelType;
  params: Record<ModelType, ModelParams>;
  setParam: (key: string, value: number) => void;

  running: boolean;
  toggleRunning: () => void;
  stepsPerFrame: number;
  setStepsPerFrame: (v: number) => void;
  gridSize: number;

  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  brushRadius: number;
  setBrushRadius: (r: number) => void;
  brushIntensity: number;

  colormap: ColormapName;
  setColormap: (c: ColormapName) => void;
  initialCondition: InitialCondition;

  showParams: boolean;
  toggleParams: () => void;

  activityLevel: number;
  setActivityLevel: (v: number) => void;
}

export const useSimulation = create<SimulationStore>((set) => ({
  model: 'gray-scott',
  params: { 'gray-scott': { ...MODEL_CONFIGS['gray-scott'].defaults } },
  setParam: (key, value) => set((s) => ({
    params: { ...s.params, [s.model]: { ...s.params[s.model], [key]: value } },
  })),

  running: true,
  toggleRunning: () => set((s) => ({ running: !s.running })),
  stepsPerFrame: 8,
  setStepsPerFrame: (v) => set({ stepsPerFrame: v }),
  gridSize: 512,

  activeTool: 'inject',
  setActiveTool: (tool) => set({ activeTool: tool }),
  brushRadius: 20,
  setBrushRadius: (r) => set({ brushRadius: Math.max(5, Math.min(80, r)) }),
  brushIntensity: 0.5,

  colormap: 'viridis',
  setColormap: (c) => set({ colormap: c }),
  initialCondition: 'center',

  showParams: false,
  toggleParams: () => set((s) => ({ showParams: !s.showParams })),

  activityLevel: 0,
  setActivityLevel: (v) => set({ activityLevel: v }),
}));
