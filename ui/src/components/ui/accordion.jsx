import React, { useState } from 'react';
export function Accordion({ type = "multiple", className="", children }) {
  return <div className={className}>{children}</div>
}
export function AccordionItem({ value, children }) {
  return <div data-value={value} className="border rounded-2xl mb-2 bg-white">{children}</div>
}
export function AccordionTrigger({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={()=>setOpen(o=>!o)} className="w-full text-left px-4 py-3 font-medium">
      <span className="inline-block mr-2">{open ? "▾" : "▸"}</span>{children}
    </button>
  );
}
export function AccordionContent({ children }) {
  return <div className="px-4 pb-4">{children}</div>
}
