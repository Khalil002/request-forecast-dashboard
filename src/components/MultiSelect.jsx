import { useEffect, useId, useRef, useState } from 'react';

/** Dropdown with a checkbox list; empty selection means "All". */
export function MultiSelect({ label, options, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const summary = selected.length === 0 ? 'All' : selected.length === 1 ? options[selected[0]] : `${selected.length} selected`;

  return (
    <div className="multiselect" ref={ref}>
      <button
        type="button"
        className={`control${selected.length ? ' is-active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="control-label">{label}</span>
        <span className="control-value">{summary}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      {open && (
        <fieldset className="popover" id={id}>
          <legend className="sr-only">{label}</legend>
          {options.map((name, code) => (
            <label key={name} className="check">
              <input type="checkbox" checked={selected.includes(code)} onChange={() => onToggle(code)} />
              {name}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
