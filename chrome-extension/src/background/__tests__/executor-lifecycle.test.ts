import { describe, expect, it } from 'vitest';
import { ExecutionState } from '../../background/agent/event/types';
import { shouldCleanupExecutorOnTerminalEvent } from '../executor-lifecycle';

describe('shouldCleanupExecutorOnTerminalEvent', () => {
  it('keeps the executor alive for terminal task events during plan execution', () => {
    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.TASK_OK,
        isPlanExecutionActive: true,
      }),
    ).toBe(false);

    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.TASK_FAIL,
        isPlanExecutionActive: true,
      }),
    ).toBe(false);
  });

  it('cleans up the executor for normal terminal task events', () => {
    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.TASK_OK,
        isPlanExecutionActive: false,
      }),
    ).toBe(true);

    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.TASK_CANCEL,
        isPlanExecutionActive: false,
      }),
    ).toBe(true);
  });

  it('ignores non-terminal task events', () => {
    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.TASK_START,
        isPlanExecutionActive: false,
      }),
    ).toBe(false);

    expect(
      shouldCleanupExecutorOnTerminalEvent({
        state: ExecutionState.STEP_OK,
        isPlanExecutionActive: true,
      }),
    ).toBe(false);
  });
});
