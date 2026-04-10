import { useEffect, useMemo, useState } from 'react';
import type { PlanSession, PlanStep } from '@extension/storage';

interface PlanBuilderProps {
  plan: PlanSession | null;
  executing: boolean;
  onCreatePlan: () => Promise<void>;
  onSave: (steps: PlanStep[], title: string) => Promise<void>;
  onExecute: (steps: PlanStep[]) => Promise<void>;
}

const createStep = (order: number): PlanStep => ({
  id: crypto.randomUUID(),
  content: '',
  order,
});

export default function PlanBuilder({ plan, executing, onCreatePlan, onSave, onExecute }: PlanBuilderProps) {
  const [title, setTitle] = useState(plan?.title ?? 'New Plan');
  const [steps, setSteps] = useState<PlanStep[]>(plan?.steps ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(plan?.title ?? 'New Plan');
    setSteps(plan?.steps ?? []);
    setDirty(false);
  }, [plan]);

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);

  const updateStep = (id: string, content: string) => {
    setDirty(true);
    setSteps(prev => prev.map(step => (step.id === id ? { ...step, content } : step)));
  };

  const addStep = () => {
    setDirty(true);
    setSteps(prev => [...prev, createStep(prev.length)]);
  };

  const removeStep = (id: string) => {
    setDirty(true);
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
    await onSave(
      sortedSteps.map((step, index) => ({
        ...step,
        order: index,
      })),
      title,
    );
    setDirty(false);
  };

  const handleExecute = async () => {
    const validSteps = sortedSteps.filter(step => step.content.trim() !== '');
    if (validSteps.length === 0) return;
    await onExecute(validSteps);
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
      <div className="rounded-lg border border-[#fdb56f]/25 bg-[#fffaf5] p-3">
        <label htmlFor="plan-title" className="mb-1 block text-xs text-[#8a490d]">
          Plan Title
        </label>
        <input
          id="plan-title"
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="w-full rounded-md border border-[#fdb56f]/30 bg-white px-3 py-2 text-sm text-[#6f3909]"
          placeholder="Plan title"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-[#fdb56f]/20 bg-[#fff8f1] p-3">
        {sortedSteps.length === 0 && <p className="text-sm text-[#a35b19]">No steps yet. Add your first step.</p>}
        {sortedSteps.map((step, index) => (
          <div key={step.id} className="rounded-md border border-[#fdb56f]/25 bg-white p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[#8a490d]">Step {index + 1}</span>
              <button
                type="button"
                onClick={() => removeStep(step.id)}
                className="text-xs text-red-500 hover:text-red-600">
                Remove
              </button>
            </div>
            <textarea
              value={step.content}
              onChange={e => updateStep(step.id, e.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-[#fdb56f]/20 p-2 text-sm text-[#6f3909] outline-none focus:border-[#fdb56f]"
              placeholder="Describe what this step should do..."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addStep}
          className="rounded-md border border-[#fdb56f]/30 px-3 py-2 text-sm text-[#8a490d]">
          + Add Step
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty}
            className="rounded-md border border-[#fdb56f]/30 px-3 py-2 text-sm text-[#8a490d] disabled:opacity-50">
            Save
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
