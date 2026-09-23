import './StateMessage.css';

/** Loading / error / empty states, in one consistent style. */
export function StateMessage({ title, children, action }: { title: string; children?: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="state" role="status">
      <p className="state__title">{title}</p>
      {children && <p className="state__body">{children}</p>}
      {action && (
        <button type="button" className="pill" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
