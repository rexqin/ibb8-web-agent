import { ExecutionState } from './agent/event/types';

export function isTerminalTaskExecutionState(state: ExecutionState): boolean {
  return state === ExecutionState.TASK_OK || state === ExecutionState.TASK_FAIL || state === ExecutionState.TASK_CANCEL;
}

export function shouldCleanupExecutorOnTerminalEvent(params: {
  state: ExecutionState;
  isPlanExecutionActive: boolean;
}): boolean {
  const { state, isPlanExecutionActive } = params;
  if (!isTerminalTaskExecutionState(state)) {
    return false;
  }

  // Plan execution reuses the same executor across follow-up tasks.
  if (isPlanExecutionActive) {
    return false;
  }

  return true;
}
