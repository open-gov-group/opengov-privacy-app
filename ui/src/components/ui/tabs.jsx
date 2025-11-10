import React, { useState, createContext, useContext } from 'react';
const TabsCtx = createContext();
export function Tabs({ defaultValue, children }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsCtx.Provider value={{value, setValue}}>{children}</TabsCtx.Provider>
}
export function TabsList({ className="", children }) {
  return <div className={`inline-flex rounded-xl border bg-white p-1 ${className}`}>{children}</div>
}
export function TabsTrigger({ value, children }) {
  const { value: v, setValue } = useContext(TabsCtx);
  const active = v === value;
  return (
    <button onClick={()=>setValue(value)}
      className={`px-3 py-1.5 text-sm rounded-lg ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}
export function TabsContent({ value, children }) {
  const { value: v } = useContext(TabsCtx);
  if (v !== value) return null;
  return <div className="mt-3">{children}</div>
}
