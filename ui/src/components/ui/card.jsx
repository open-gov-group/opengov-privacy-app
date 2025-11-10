export function Card({ className = "", ...props }) {
  return <div className={`border rounded-2xl bg-white ${className}`} {...props} />
}
export function CardContent({ className = "", ...props }) {
  return <div className={`p-4 ${className}`} {...props} />
}
