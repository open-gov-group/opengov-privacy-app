import React from 'react';

export function Button({ variant = "default", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium transition";
  const styles = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border bg-white hover:bg-slate-50"
  }[variant] || "";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

