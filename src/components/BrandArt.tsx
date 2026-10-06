import type { Profile } from '../db/models'
export function BrandArt({
  kind = 'bag',
  size = 96,
}: {
  kind?: NonNullable<Profile['avatarPresetId']>
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 25 20 20M79 13l-2 9M85 38l8 3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {kind === 'bag' && (
        <>
          <path
            d="m24 36 49-3 7 48-60 2Z"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M35 40V28c0-20 29-20 29 0v11"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="m34 61 10 10 20-23"
            stroke="var(--ink)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'star' && (
        <path
          d="m50 16 11 23 26 4-19 19 4 26-23-13-23 12 5-27-18-18 26-3Z"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      )}
      {kind === 'gift' && (
        <>
          <path
            d="M22 48h57v35H22zM18 34h65v15H18z"
            fill="var(--secondary)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
          <path
            d="M50 34v50M50 34C20 33 24 12 37 18c10 5 13 16 13 16Zm0 0c28-2 24-22 12-16-9 5-12 16-12 16Z"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
        </>
      )}
      {kind === 'leaf' && (
        <>
          <path
            d="M22 78C9 33 42 21 78 21c0 37-11 66-56 57Z"
            fill="var(--secondary)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
          <path
            d="m21 80 42-43m-24 8 2 15 16 2"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === 'planet' && (
        <>
          <circle
            cx="51"
            cy="50"
            r="27"
            fill="var(--secondary)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
          <ellipse
            cx="51"
            cy="51"
            rx="44"
            ry="12"
            transform="rotate(-25 51 51)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
          <path
            d="m40 38 3-3m17 26 3-3"
            stroke="var(--ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
export function Wordmark() {
  return (
    <span className="row" style={{ gap: 8, fontWeight: 900, fontSize: 20 }}>
      <BrandArt size={40} />
      Cartoon Check
    </span>
  )
}
