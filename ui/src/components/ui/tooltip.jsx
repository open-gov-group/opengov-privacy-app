export function TooltipProvider({ children }) { return children }
export function Tooltip({ children }) { return children }
export function TooltipTrigger({ children }) { return children }
export function TooltipContent({ children }) {
  return <div className="inline-block rounded-md border bg-white px-2 py-1 text-xs shadow">{children}</div>
}
