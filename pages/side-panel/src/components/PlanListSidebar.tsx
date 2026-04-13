import type { PlanSessionMetadata } from '@extension/storage';
import { t } from '@extension/i18n';

export interface PlanListSidebarProps {
  plans: PlanSessionMetadata[];
  currentPlanId: string | null;
  /** When true, selecting another plan or deleting is disabled */
  disabled?: boolean;
  onCreatePlan: () => void;
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export default function PlanListSidebar({
  plans,
  currentPlanId,
  disabled = false,
  onCreatePlan,
  onSelectPlan,
  onDeletePlan,
}: PlanListSidebarProps) {
  return (
    <section
      className="flex h-full min-h-0 w-full flex-col border-b border-[#fdb56f]/20 bg-[#fff8f1]"
      aria-label={t('nav_planList_title')}>
      <div className="border-b border-[#fdb56f]/20 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8a490d]">{t('nav_planList_title')}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {plans.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-1 py-2">
            <p className="mb-2 text-sm leading-snug text-[#a35b19]">{t('nav_planList_empty')}</p>
            <button
              type="button"
              onClick={onCreatePlan}
              className="rounded-md bg-[#fdb56f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#ee9b47]">
              {t('nav_planList_create')}
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map(plan => (
              <li key={plan.id} className="group relative">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                    currentPlanId === plan.id
                      ? 'border-[#fdb56f]/50 bg-[#fdb56f]/25 font-medium text-[#5c3008]'
                      : 'border-[#fdb56f]/20 bg-white text-[#6f3909] hover:bg-[#fff0e4]'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <span className="line-clamp-2 break-words">{plan.title}</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-[#a35b19]">
                    {t('nav_planList_steps', [String(plan.stepCount)])}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={e => {
                    e.stopPropagation();
                    onDeletePlan(plan.id);
                  }}
                  className="absolute bottom-1 right-1 rounded px-1 text-[10px] text-[#b45309] opacity-0 transition-opacity hover:bg-[#ffe8d4] disabled:pointer-events-none disabled:opacity-0 group-hover:opacity-100"
                  aria-label={t('nav_planList_delete_a11y')}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
