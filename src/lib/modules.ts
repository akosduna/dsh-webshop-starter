import { modules, type ModuleDefinition, type ModuleId } from '@/config/modules';
import { isPlaceholderValue } from '@/lib/env';

export type ModuleState = 'ready' | 'missing_keys' | 'disabled';

export type ModuleStatus = {
  id: ModuleId;
  label: string;
  description: string;
  state: ModuleState;
  missingEnv: string[];
};

type Env = Record<string, string | undefined>;

/** Pure: status of one module for a given environment (unit-tested). */
export function evaluateModule(definition: ModuleDefinition, env: Env): ModuleStatus {
  const missingEnv = definition.requiredEnv.filter((name) => isPlaceholderValue(env[name]));
  const state: ModuleState = !definition.enabled
    ? 'disabled'
    : missingEnv.length > 0
      ? 'missing_keys'
      : 'ready';
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    state,
    missingEnv,
  };
}

export function getModuleStatus(id: ModuleId, env: Env = process.env): ModuleStatus {
  return evaluateModule(modules[id], env);
}

/** Enabled in src/config/modules.ts AND every required key is set. */
export function isModuleReady(id: ModuleId, env: Env = process.env): boolean {
  return getModuleStatus(id, env).state === 'ready';
}

export function getAllModuleStatuses(env: Env = process.env): ModuleStatus[] {
  return Object.values(modules).map((definition) => evaluateModule(definition, env));
}
