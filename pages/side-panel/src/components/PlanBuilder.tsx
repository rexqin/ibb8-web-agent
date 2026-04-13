import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanSession, PlanStep } from '@extension/storage';

type PlanStepUiExecStatus = 'pending' | 'running' | 'ok' | 'fail' | 'cancel';

interface PlanBuilderProps {
  plan: PlanSession | null;
  executing: boolean;
  stepStatusByStepId?: Record<string, PlanStepUiExecStatus>;
  onCreatePlan: () => Promise<void>;
  onSave: (steps: PlanStep[], title: string) => Promise<void>;
  onExecute: (steps: PlanStep[], title: string) => Promise<void>;
  onStopTask: () => void;
}

const createStep = (order: number): PlanStep => ({
  id: crypto.randomUUID(),
  content: '',
  order,
});

function stepStatusLabel(status: PlanStepUiExecStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Running';
    case 'ok':
      return 'Done';
    case 'fail':
      return 'Failed';
    case 'cancel':
      return 'Cancelled';
    default:
      return '';
  }
}

export default function PlanBuilder({
  plan,
  executing,
  stepStatusByStepId,
  onCreatePlan,
  onSave,
  onExecute,
  onStopTask,
}: PlanBuilderProps) {
  const [title, setTitle] = useState(plan?.title ?? 'New Plan');
  const [steps, setSteps] = useState<PlanStep[]>(plan?.steps ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const saveNoticeTimerRef = useRef<number | null>(null);

  // Re-hydrate when switching plans or after save (updatedAt); avoid resetting on unrelated parent re-renders that replace `plan` by reference only.
  useEffect(() => {
    if (!plan) return;
    setTitle(plan.title ?? 'New Plan');
    setSteps(plan.steps ?? []);
  }, [plan?.id, plan?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- snapshot id + updatedAt

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current !== null) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
    };
  }, []);

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);

  const updateStep = (id: string, content: string) => {
    setSteps(prev => prev.map(step => (step.id === id ? { ...step, content } : step)));
  };

  const addStep = () => {
    setSteps(prev => [...prev, createStep(prev.length)]);
  };

  const removeStep = (id: string) => {
    setSteps(prev =>
      prev
        .filter(step => step.id !== id)
        .map((step, index) => ({
          ...step,
          order: index,
        })),
    );
  };

  const handleSave = async () => {
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
      saveNoticeTimerRef.current = null;
    }
    setSaveNotice(null);
    setIsSaving(true);
    try {
      await onSave(
        sortedSteps.map((step, index) => ({
          ...step,
          order: index,
        })),
        title,
      );
      setSaveNotice({ type: 'ok', text: '已保存' });
      saveNoticeTimerRef.current = window.setTimeout(() => {
        setSaveNotice(null);
        saveNoticeTimerRef.current = null;
      }, 2500);
    } catch (err) {
      console.error('Plan save failed', err);
      const text = err instanceof Error ? err.message : String(err);
      setSaveNotice({ type: 'err', text: text || '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    const validSteps = sortedSteps.filter(step => step.content.trim() !== '');
    if (validSteps.length === 0) return;
    await onExecute(validSteps, title);
  };

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <button
          type="button"
          onClick={() => void onCreatePlan()}
          className="rounded-md bg-[#fdb56f] px-4 py-2 font-medium text-white hover:bg-[#ee9b47]">
          Create Plan
        </button>
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col gap-3 p-3">
      {saveNotice ? (
        <div
          role="status"
          className={`rounded-md px-3 py-2 text-sm ${
            saveNotice.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'
          }`}>
          {saveNotice.text}
        </div>
      ) : null}
      <div className="rounded-lg border border-[#fdb56f]/25 bg-[#fffaf5] p-3">
        <label htmlFor="plan-title" className="mb-1 block text-xs text-[#8a490d]">
          Plan Title
        </label>
        <input
          id="plan-title"
          type="text"
          value={title}
          disabled={executing}
          onChange={e => {
            setTitle(e.target.value);
          }}
          className="w-full rounded-md border border-[#fdb56f]/30 bg-white px-3 py-2 text-sm text-[#6f3909] disabled:opacity-60"
          placeholder="Plan title"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-[#fdb56f]/20 bg-[#fff8f1] p-3">
        {executing && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#fdb56f]/40 bg-white px-3 py-2">
            <p className="text-sm font-medium text-[#8a490d]">Running plan — progress updates below each step.</p>
            <button
              type="button"
              onClick={() => onStopTask()}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              Stop
            </button>
          </div>
        )}
        {sortedSteps.length === 0 && <p className="text-sm text-[#a35b19]">No steps yet. Add your first step.</p>}
        {sortedSteps.map((step, index) => (
          <div key={step.id} className="rounded-md border border-[#fdb56f]/25 bg-white p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#8a490d]">Step {index + 1}</span>
              <div className="flex items-center gap-2">
                {stepStatusByStepId?.[step.id] ? (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      stepStatusByStepId[step.id] === 'running'
                        ? 'bg-amber-100 text-amber-900'
                        : stepStatusByStepId[step.id] === 'ok'
                          ? 'bg-emerald-100 text-emerald-800'
                          : stepStatusByStepId[step.id] === 'fail'
                            ? 'bg-red-100 text-red-800'
                            : stepStatusByStepId[step.id] === 'cancel'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-[#fff3e0] text-[#8a490d]'
                    }`}>
                    {stepStatusLabel(stepStatusByStepId[step.id])}
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={executing}
                  onClick={() => removeStep(step.id)}
                  className="text-xs text-red-500 hover:text-red-600 disabled:opacity-40">
                  Remove
                </button>
              </div>
            </div>
            <textarea
              value={step.content}
              disabled={executing}
              onChange={e => updateStep(step.id, e.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-[#fdb56f]/20 p-2 text-sm text-[#6f3909] outline-none focus:border-[#fdb56f] disabled:opacity-60"
              placeholder="Describe what this step should do..."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={executing}
          onClick={addStep}
          className="rounded-md border border-[#fdb56f]/30 px-3 py-2 text-sm text-[#8a490d] disabled:opacity-50">
          + Add Step
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={executing || isSaving}
            className="rounded-md border border-[#fdb56f]/30 px-3 py-2 text-sm text-[#8a490d] disabled:opacity-50">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void handleExecute()}
            disabled={executing}
            className="rounded-md bg-[#fdb56f] px-3 py-2 text-sm text-white hover:bg-[#ee9b47] disabled:opacity-50">
            {executing ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>
    </section>
  );
}
