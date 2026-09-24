import './CategoryFilter.css';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** Pill filter bar (gchf menu style); the active pill is filled black. */
export function CategoryFilter({ options, value, onChange, label }: { options: FilterOption[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="filter" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="pill" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          <span className="filter__count">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
