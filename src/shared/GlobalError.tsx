export function GlobalError({ error }: { error: unknown }) {
  return (
    <div style={{ height: '100vh', alignContent: 'center' }}>
      <div
        style={{
          color: 'indianred',
          fontFamily: 'monospace',
          overflowWrap: 'break-word',
        }}
      >
        {String(error)}
      </div>
    </div>
  )
}
