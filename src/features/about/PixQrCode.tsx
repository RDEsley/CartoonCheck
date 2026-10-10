import qrcode from 'qrcode-generator'
import styles from './about.module.css'

const quietZone = 4

/** The code as an SVG, always black on white so bank apps can read it in any theme. */
export function PixQrCode({ value }: { value: string }) {
  const qr = qrcode(0, 'M')
  qr.addData(value)
  qr.make()
  const count = qr.getModuleCount()
  const total = count + quietZone * 2
  let path = ''
  for (let row = 0; row < count; row++)
    for (let column = 0; column < count; column++)
      if (qr.isDark(row, column))
        path += `M${String(column + quietZone)} ${String(row + quietZone)}h1v1h-1z`
  return (
    <svg
      className={styles.qr}
      viewBox={`0 0 ${String(total)} ${String(total)}`}
      role="img"
      aria-label="QR Code do Pix"
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
