export function VStack({
  style,
  gap,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { gap: number }) {
  return (
    <div
      className="v-stack"
      style={{ display: 'grid', gap, ...style }}
      {...props}
    />
  )
}
