import { ExecutionState, type AgentEvent, type EventType, type EventCallback } from './types';
import { createLogger } from '../../log';

const logger = createLogger('event-manager');

export class EventManager {
  private _subscribers: Map<EventType, EventCallback[]>;
  private _taskStates: Map<
    string,
    {
      pausedMs: number;
      pauseStartedAt: number | null;
      taskStartAt?: number;
      taskPausedSnapshotAtStart?: number;
      stepStarts: Map<string, { startAt: number; pausedSnapshotAtStart: number }>;
      actStarts: Map<string, { startAt: number; pausedSnapshotAtStart: number }>;
    }
  >;

  constructor() {
    this._subscribers = new Map();
    this._taskStates = new Map();
  }

  subscribe(eventType: EventType, callback: EventCallback): void {
    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, []);
    }

    const callbacks = this._subscribers.get(eventType);
    if (callbacks && !callbacks.includes(callback)) {
      callbacks.push(callback);
    }
  }

  unsubscribe(eventType: EventType, callback: EventCallback): void {
    if (this._subscribers.has(eventType)) {
      const callbacks = this._subscribers.get(eventType);
      if (callbacks) {
        this._subscribers.set(
          eventType,
          callbacks.filter(cb => cb !== callback),
        );
      }
    }
  }

  clearSubscribers(eventType: EventType): void {
    if (this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, []);
    }
  }

  private getOrCreateTaskState(taskId: string) {
    let state = this._taskStates.get(taskId);
    if (!state) {
      state = {
        pausedMs: 0,
        pauseStartedAt: null,
        stepStarts: new Map(),
        actStarts: new Map(),
      };
      this._taskStates.set(taskId, state);
    }
    return state;
  }

  private getTotalPausedMs(
    taskState: {
      pausedMs: number;
      pauseStartedAt: number | null;
    },
    now: number,
  ): number {
    if (taskState.pauseStartedAt === null) {
      return taskState.pausedMs;
    }
    return taskState.pausedMs + (now - taskState.pauseStartedAt);
  }

  private attachDurations(event: AgentEvent): void {
    const taskId = event.data.taskId;
    const taskState = this.getOrCreateTaskState(taskId);
    const now = event.timestamp;
    const stepKey = `${event.actor}:${event.data.step}`;

    if (event.state === ExecutionState.TASK_PAUSE) {
      if (taskState.pauseStartedAt === null) {
        taskState.pauseStartedAt = now;
      }
      return;
    }

    if (event.state === ExecutionState.TASK_RESUME) {
      if (taskState.pauseStartedAt !== null) {
        taskState.pausedMs += now - taskState.pauseStartedAt;
        taskState.pauseStartedAt = null;
      }
      return;
    }

    if (event.state === ExecutionState.TASK_START) {
      taskState.taskStartAt = now;
      taskState.taskPausedSnapshotAtStart = this.getTotalPausedMs(taskState, now);
      taskState.stepStarts.clear();
      taskState.actStarts.clear();
      return;
    }

    if (event.state === ExecutionState.STEP_START) {
      taskState.stepStarts.set(stepKey, {
        startAt: now,
        pausedSnapshotAtStart: this.getTotalPausedMs(taskState, now),
      });
      return;
    }

    if (event.state === ExecutionState.ACT_START) {
      taskState.actStarts.set(stepKey, {
        startAt: now,
        pausedSnapshotAtStart: this.getTotalPausedMs(taskState, now),
      });
      return;
    }

    if (event.state === ExecutionState.ACT_OK || event.state === ExecutionState.ACT_FAIL) {
      const start = taskState.actStarts.get(stepKey);
      if (start) {
        const pausedAtEnd = this.getTotalPausedMs(taskState, now);
        const raw = now - start.startAt;
        const active = Math.max(0, raw - (pausedAtEnd - start.pausedSnapshotAtStart));
        event.data.elapsedMs = raw;
        event.data.activeElapsedMs = active;
        taskState.actStarts.delete(stepKey);
      }
      return;
    }

    if (
      event.state === ExecutionState.STEP_OK ||
      event.state === ExecutionState.STEP_FAIL ||
      event.state === ExecutionState.STEP_CANCEL
    ) {
      const start = taskState.stepStarts.get(stepKey);
      if (start) {
        const pausedAtEnd = this.getTotalPausedMs(taskState, now);
        const raw = now - start.startAt;
        const active = Math.max(0, raw - (pausedAtEnd - start.pausedSnapshotAtStart));
        event.data.elapsedMs = raw;
        event.data.activeElapsedMs = active;
        taskState.stepStarts.delete(stepKey);
      }
      return;
    }

    if (
      event.state === ExecutionState.TASK_OK ||
      event.state === ExecutionState.TASK_FAIL ||
      event.state === ExecutionState.TASK_CANCEL
    ) {
      if (taskState.taskStartAt !== undefined && taskState.taskPausedSnapshotAtStart !== undefined) {
        const pausedAtEnd = this.getTotalPausedMs(taskState, now);
        const raw = now - taskState.taskStartAt;
        const active = Math.max(0, raw - (pausedAtEnd - taskState.taskPausedSnapshotAtStart));
        event.data.elapsedMs = raw;
        event.data.activeElapsedMs = active;
      }
      this._taskStates.delete(taskId);
    }
  }

  async emit(event: AgentEvent): Promise<void> {
    this.attachDurations(event);
    const callbacks = this._subscribers.get(event.type);
    if (callbacks) {
      try {
        await Promise.all(callbacks.map(async callback => await callback(event)));
      } catch (error) {
        logger.error('Error executing event callbacks:', error);
      }
    }
  }
}
