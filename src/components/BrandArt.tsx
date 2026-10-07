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
      {kind === 'heart' && (
        <>
          <path
            d="M50 85C17 62 13 39 26 27c10-9 22-4 24 7 2-11 14-16 24-7 13 12 9 35-24 58Z"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M33 40c1-5 5-8 9-7"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === 'flower' && (
        <>
          {[
            [50, 29],
            [71, 45],
            [63, 70],
            [37, 70],
            [29, 45],
          ].map(([x, y]) => (
            <circle
              key={`${String(x)}-${String(y)}`}
              cx={x}
              cy={y}
              r="14"
              fill="var(--secondary)"
              stroke="var(--ink)"
              strokeWidth="3.5"
            />
          ))}
          <circle
            cx="50"
            cy="52"
            r="11"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
        </>
      )}
      {kind === 'rocket' && (
        <>
          <path
            d="M43 68c1 9 4 14 7 19 3-5 6-10 7-19Z"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M36 58 23 73l14-3M64 58l13 15-14-3"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M50 13c15 11 19 32 14 55H36c-5-23-1-44 14-55Z"
            fill="var(--secondary)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle
            cx="50"
            cy="40"
            r="8"
            fill="var(--surface)"
            stroke="var(--ink)"
            strokeWidth="3.5"
          />
        </>
      )}
      {kind === 'cloud' && (
        <>
          <path
            d="M29 74c-12 0-19-8-17-18 2-8 9-12 17-10 2-13 15-19 26-15 9 3 14 11 14 19 10-1 18 5 18 13 0 8-6 11-14 11Z"
            fill="var(--secondary)"
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="m40 60 7 7 14-16"
            stroke="var(--ink)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'bolt' && (
        <path
          d="M58 13 27 55h19l-7 33 35-47H55Z"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
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
