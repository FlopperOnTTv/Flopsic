import { useEffect, useId, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import "./GlideSelect.css";

export type GlideOption = { value: string; label: string; tag?: string };
type Props = { options: GlideOption[]; value: string; onChange: (value: string) => void; ariaLabel: string; className?: string; menuWidth?: number };

export function GlideSelect({ options, value, onChange, ariaLabel, className = "", menuWidth = 176 }: Props) {
  const [open, setOpen] = useState(false); const [active, setActive] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null); const id = useId(); const selected = options.findIndex((option) => option.value === value);
  useEffect(() => { const dismiss = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", dismiss); return () => document.removeEventListener("pointerdown", dismiss); }, []);
  const choose = (index: number) => { const option = options[index]; if (option) onChange(option.value); setOpen(false); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((active ?? selected) + 1 >= options.length ? 0 : (active ?? selected) + 1); } if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((active ?? selected) - 1 < 0 ? options.length - 1 : (active ?? selected) - 1); } if ((event.key === "Enter" || event.key === " ") && open && active !== null) { event.preventDefault(); choose(active); } };
  return <div ref={root} className={`glide-select ${className}`} style={{ "--gs-menu-w": `${menuWidth}px` } as React.CSSProperties}>
    <button type="button" className="glide-select__trigger" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={`${id}-list`} onClick={() => { setOpen(!open); setActive(selected); }} onKeyDown={onKeyDown}><span>{options[selected]?.label}</span><HugeiconsIcon icon={ArrowDown01Icon} size={14} /></button>
    {open && <div className="glide-select__menu" id={`${id}-list`} role="listbox">{options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={index === selected} className={`glide-select__option ${index === active ? "is-active" : ""}`} onPointerEnter={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{option.tag && <small>{option.tag}</small>}{index === selected && <HugeiconsIcon icon={Tick02Icon} size={14} />}</button>)}</div>}
  </div>;
}
