export function VStack({
  style,
  gap,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { gap: number }) {
  return <div style={{ display: 'grid', gap, ...style }} {...props} />
}
