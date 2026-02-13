export type ModelType = 'gray-scott';

export type ToolType = 'inject' | 'erase';

export type InitialCondition = 'center' | 'noise' | 'clear';

export type ColormapName = 'viridis' | 'magma' | 'inferno' | 'plasma' | 'grayscale';

export interface ModelParams {
  [key: string]: number;
}

export interface ModelParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ModelConfig {
  id: ModelType;
  name: string;
  paramDefs: ModelParamDef[];
  defaults: ModelParams;
}
