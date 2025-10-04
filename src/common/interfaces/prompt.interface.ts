export interface PromptLayer {
  layer: 'system' | 'user' | 'context';
  content: string;
  priority: number;
}

export interface PromptVariables {
  [key: string]: string | number | boolean | object;
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextPrompt: string;
  fullPrompt: string;
}

export interface PromptInjectionCheckResult {
  isSafe: boolean;
  threats: string[];
  sanitizedInput?: string;
}
