import type { PlanRun, PlanSessionMetadata } from '@extension/storage';

interface PlanHistoryListProps {
  plans: PlanSessionMetadata[];
  runsByPlanId: Record<string, PlanRun[]>;
  onPlanSelect: (planId: string) => void;
  onPlanDelete: (planId: string) => void;
  visible: boolean;
}

const statusColorMap: Record<string, string> = {
  running: 'text-blue-600',
  ok: 'text-green-600',
  fail: 'text-red-600',
  cancel: 'text-gray-500',
};

export default function PlanHistoryList({
  plans,
  runsByPlanId,
  onPlanSelect,
  onPlanDelete,
  visible,
}: PlanHistoryListProps) {
  if (!visible) return null;

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-lg font-semibold">Plan History</h2>
      {plans.length === 0 ? (
        <div className="rounded-lg p-4 text-center">No plan history yet.</div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const latestRun = runsByPlanId[plan.id]?.[0];
            return (
              <div key={plan.id} className="group relative rounded-lg p-3">
                <button onClick={() => onPlanSelect(plan.id)} className="w-full text-left" type="button">
                  <h3 className="text-sm font-medium">{plan.title}</h3>
                  <p className="mt-1 text-xs">Steps: {plan.stepCount}</p>
                  {latestRun && (
                    <p className={`mt-1 text-xs ${statusColorMap[latestRun.status] ?? ''}`}>
                      Latest run: {latestRun.status} ({new Date(latestRun.startedAt).toLocaleString()})
                    </p>
                  )}
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onPlanDelete(plan.id);
                  }}
                  className="absolute bottom-2 right-2 rounded p-1 text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100"
                  type="button">
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
