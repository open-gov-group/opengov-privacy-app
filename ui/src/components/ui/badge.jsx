import React from 'react';

export function Badge({ variant = "default", className = "", children, ...props }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs";
  const styles = {
    default: "bg-slate-900 text-white",
    secondary: "bg-slate-100 text-slate-900",
    outline: "border"
  }[variant] || "";
  return (
    <span className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </span>
  );
}

