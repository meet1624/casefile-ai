import { useId } from 'react'

/** Cover art for a case. Known cases have their own scene; any other case gets a stable one from its id. */
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

function Gala({ u }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a1220" /><stop offset="1" stopColor="#14060c" /></linearGradient>
        <radialGradient id={`${u}-spot`} cx="50%" cy="0%" r="80%"><stop offset="0" stopColor="#ffd28a" stopOpacity=".5" /><stop offset="1" stopColor="#ffd28a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#${u}-bg)`} />
      <rect width="200" height="150" fill={`url(#${u}-spot)`} />
      <rect x="46" y="18" width="108" height="78" fill="#d9a441" /><rect x="52" y="24" width="96" height="66" fill="#120a10" />
      <path d="M52 78C74 62 92 72 110 60S136 66 148 62V90H52Z" fill="#2a3a48" /><path d="M52 84C80 74 100 82 148 76V90H52Z" fill="#1a2630" />
      <circle cx="124" cy="42" r="9" fill="#f0d9a0" />
      <path d="M46 18h108v78H46Z" fill="none" stroke="#f0c46c" strokeWidth="2" opacity=".6" />
      <g transform="translate(142 98)" fill="none" stroke="#f0c46c" strokeWidth="2.4" strokeLinecap="round"><path d="M-10 0C-10 14 10 14 10 0Z" fill="#f0c46c" fillOpacity=".25" /><path d="M0 11V32M-9 32H9" /></g>
      <path d="M0 150V126C40 118 70 134 100 128S170 120 200 130V150Z" fill="#0a0408" />
    </>
  )
}
function Violin({ u }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14464d" /><stop offset="1" stopColor="#06141a" /></linearGradient>
        <radialGradient id={`${u}-spot`} cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#f2d8a0" stopOpacity=".38" /><stop offset="1" stopColor="#f2d8a0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#${u}-bg)`} /><rect width="200" height="150" fill={`url(#${u}-spot)`} />
      <g transform="rotate(-22 100 78)">
        <path d="M100 18V50" stroke="#2a1a10" strokeWidth="9" strokeLinecap="round" />
        <path d="M100 44C70 44 62 62 76 76C60 84 60 112 100 114C140 112 140 84 124 76C138 62 130 44 100 44Z" fill="#a8541f" stroke="#5a2a0f" strokeWidth="2" />
        <path d="M82 62C94 56 106 56 118 62" stroke="#e0a060" strokeWidth="2" fill="none" opacity=".5" />
        <path d="M84 84c-4 8-2 14 2 18M116 84c4 8 2 14-2 18" stroke="#1a0c06" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M95 50V108M105 50V108" stroke="#e8d6a8" strokeWidth=".8" opacity=".7" />
        <rect x="92" y="106" width="16" height="5" rx="2" fill="#2a1a10" />
      </g>
      <path d="M26 128L176 36" stroke="#d9c9a0" strokeWidth="1.8" opacity=".85" /><path d="M26 128L32 124" stroke="#2a1a10" strokeWidth="4" />
    </>
  )
}
function Train({ u }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c2838" /><stop offset="1" stopColor="#070b12" /></linearGradient>
        <radialGradient id={`${u}-lamp`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff2c8" stopOpacity=".95" /><stop offset=".3" stopColor="#ffd28a" stopOpacity=".4" /><stop offset="1" stopColor="#ffd28a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#${u}-bg)`} />
      <path d="M0 150L88 66H112L200 150Z" fill="#0b1018" />
      <path d="M86 150L97 66M114 150L103 66" stroke="#6a7a90" strokeWidth="2" />
      {[72, 82, 96, 112, 132].map((y, i) => <path key={y} d={`M${96 - (y - 66) * 0.62} ${y}H${104 + (y - 66) * 0.62}`} stroke="#3a4658" strokeWidth={1 + i * 0.5} />)}
      <circle cx="100" cy="62" r="34" fill={`url(#${u}-lamp)`} /><circle cx="100" cy="62" r="6" fill="#fff6dc" />
      <g fill="#0a0e15"><rect x="84" y="46" width="32" height="24" rx="3" /><rect x="94" y="34" width="12" height="14" /></g>
      <g fill="#7a8ba2" opacity=".35"><circle cx="124" cy="26" r="9" /><circle cx="136" cy="16" r="12" /><circle cx="152" cy="10" r="14" /></g>
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${(i * 53) % 200} ${(i * 31) % 110}l-5 14`} stroke="#9db8e8" strokeWidth=".8" opacity=".4" />)}
    </>
  )
}
function Generic({ id, u }) {
  const h = hash(id)
  const hue = h % 360
  return (
    <>
      <defs><linearGradient id={`${u}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={`hsl(${hue} 40% 22%)`} /><stop offset="1" stopColor={`hsl(${hue} 50% 6%)`} /></linearGradient></defs>
      <rect width="200" height="150" fill={`url(#${u}-bg)`} />
      <g fill="none" stroke={`hsl(${hue} 60% 62%)`} strokeLinecap="round" opacity=".8">
        {[44, 36, 28, 20, 12].map((r, i) => <path key={r} d={`M${100 - r} 76A${r} ${r} 0 0 1 ${100 + r} 76`} strokeWidth="3" strokeDasharray={`${30 + ((h >> i) % 20)} ${6 + (i % 3) * 3}`} />)}
        <path d={`M${100 - 44} 76A44 44 0 0 0 ${100 + 44} 76`} strokeWidth="3" strokeDasharray="40 8" />
      </g>
      <circle cx="100" cy="76" r="5" fill={`hsl(${hue} 60% 70%)`} />
    </>
  )
}

export default function CaseCover({ id, className = '' }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '')
  const Art = { 'midnight-gala': Gala, 'vanishing-violin': Violin, 'blackwater-express': Train }[id]
  return (
    <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      {Art ? <Art u={u} /> : <Generic id={id} u={u} />}
    </svg>
  )
}
