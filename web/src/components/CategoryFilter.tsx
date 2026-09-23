import './CategoryFilter.css';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** Pill filter bar (gchf menu style); the active pill is filled black. */
export function CategoryFilter({ options, value, onChange }: { options: FilterOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="filter" role="group" aria-label="카테고리 필터">
      {options.map((o) => (
        <button key={o.value} type="button" className="pill" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          <span className="filter__count">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
