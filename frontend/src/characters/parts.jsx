import { shade } from './color'

/* Everything below is drawn in a 400 x 480 box. The head is centred on x=200: the top of the skull is at
   y≈98, the eyes at y≈208, the mouth at y≈262 and the chin at y≈310. */

const L = 122
const R = 278

/** A cap of hair over the top of the skull. `hl` is the hairline height. */
function cap({ top = 70, hl = 130, side = 205, peak = 0 }) {
  return (
    `M${L} ${side} C${L - 8} ${top + 50} ${168} ${top} 200 ${top} C232 ${top} ${R + 8} ${top + 50} ${R} ${side}` +
    ` L${R - 8} ${side - 16} C${R - 6} ${hl + 30} 236 ${hl} 200 ${hl - peak} C164 ${hl} ${L + 6} ${hl + 30} ${L + 8} ${side - 16} Z`
  )
}

function Hair({ id, spec, layer, fw }) {
  const { style, color, streak } = spec.hair
  const dark = shade(color, 0.55)
  const light = shade(color, 1.35)
  const fill = `url(#${id}-hair)`
  const sx = fw / 75
  const wrap = (children) => <g transform={`translate(200 0) scale(${sx} 1) translate(-200 0)`}>{children}</g>

  if (layer === 'back') {
    switch (style) {
      case 'bob':
        return wrap(<g fill={dark}><path d="M116 150C96 230 100 296 126 316H170V150Z" /><path d="M284 150C304 230 300 296 274 316H230V150Z" /></g>)
      case 'long':
        return wrap(<path d="M112 150C66 240 78 340 54 440H346C322 340 334 240 288 150Z" fill={dark} />)
      case 'chignon':
        return wrap(<g><circle cx="200" cy="72" r="34" fill={dark} /><path d="M176 62C190 50 212 50 224 62" stroke={light} strokeWidth="3" fill="none" opacity=".55" /></g>)
      case 'veilhat':
        return wrap(<path d="M122 190C112 230 120 270 136 284L160 250ZM278 190C288 230 280 270 264 284L240 250Z" fill={dark} />)
      case 'curly':
        return wrap(<g fill={dark}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx={118 + (i % 2) * -6} cy={128 + i * 24} r="24" />)}{[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={`r${i}`} cx={282 + (i % 2) * 6} cy={128 + i * 24} r="24" />)}</g>)
      default:
        return null
    }
  }

  if (layer === 'locks') {
    switch (style) {
      case 'long':
        return wrap(<g fill={dark}><path d="M126 196C96 270 100 350 80 420C112 432 142 404 152 344C142 300 142 250 142 196Z" /><path d="M274 196C304 270 300 350 320 420C288 432 258 404 248 344C258 300 258 250 258 196Z" /><path d="M130 240C118 300 124 350 112 392" stroke={light} strokeWidth="3" fill="none" opacity=".35" /></g>)
      case 'braids':
        return wrap(
          <g>
            {[-1, 1].map((s) => (
              <g key={s} transform={`translate(${s < 0 ? 0 : 400} 0) scale(${s < 0 ? 1 : -1} 1)`}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => <ellipse key={i} cx={126 - i * 1.8} cy={292 + i * 24} rx="15" ry="14" fill={i % 2 ? dark : color} transform={`rotate(${i % 2 ? 14 : -14} ${126 - i * 1.8} ${292 + i * 24})`} />)}
                <rect x="108" y="458" width="26" height="8" rx="3" fill="#7a1f2b" />
              </g>
            ))}
          </g>,
        )
      default:
        return null
    }
  }

  // front layer: sits over the forehead and temples
  switch (style) {
    case 'slick':
      return wrap(
        <g>
          <path d={cap({ top: 80, hl: 132, side: 206, peak: 10 })} fill={fill} />
          <path d="M156 112C190 84 240 90 262 128M170 100C200 82 236 86 252 108" stroke={light} strokeWidth="3.4" fill="none" opacity=".55" strokeLinecap="round" />
        </g>,
      )
    case 'messy':
      return wrap(
        <g>
          <path d={cap({ top: 64, hl: 120, side: 204, peak: -6 })} fill={fill} />
          <path d="M142 124L158 168 174 126ZM178 120L196 162 212 118ZM214 120L230 156 246 124Z" fill={fill} />
          <path d="M146 96C140 80 152 70 166 80ZM240 84C252 74 264 84 258 100Z" fill={fill} />
          <path d="M160 96C180 86 212 86 240 100" stroke={light} strokeWidth="3" fill="none" opacity=".4" />
        </g>,
      )
    case 'bob':
      return wrap(
        <g>
          <path d={`M${L - 6} 214C${L - 12} 110 170 66 200 66S${R + 12} 110 ${R + 6} 214L${R - 4} 214C${R - 6} 152 250 142 200 146 150 142 ${L + 6} 152 ${L + 4} 214Z`} fill={fill} />
          <path d="M126 150C150 136 250 136 274 150L274 164C250 150 150 150 126 164Z" fill={fill} />
          <path d="M150 90C180 76 226 78 252 96" stroke={light} strokeWidth="3.4" fill="none" opacity=".45" strokeLinecap="round" />
        </g>,
      )
    case 'chignon':
      return wrap(
        <g>
          <path d={cap({ top: 72, hl: 126, side: 206, peak: 10 })} fill={fill} />
          <path d="M178 90C196 126 168 148 148 160M206 88C228 118 214 146 196 154" stroke={streak ?? light} strokeWidth="5" fill="none" opacity=".75" strokeLinecap="round" />
          <path d="M150 104C176 80 226 80 254 104" stroke={light} strokeWidth="3" fill="none" opacity=".4" />
        </g>,
      )
    case 'balding':
      return wrap(
        <g>
          <path d="M124 208C116 164 128 138 146 134C140 158 144 184 146 208Z" fill={fill} />
          <path d="M276 208C284 164 272 138 254 134C260 158 256 184 254 208Z" fill={fill} />
          <ellipse cx="204" cy="118" rx="34" ry="12" fill="#fff" opacity=".13" />
        </g>,
      )
    case 'crop':
      return wrap(
        <g>
          <path d={cap({ top: 90, hl: 130, side: 204, peak: 4 })} fill={fill} />
          <path d="M150 112C184 98 226 98 252 116" stroke={light} strokeWidth="3" fill="none" opacity=".4" />
        </g>,
      )
    case 'swept':
      return wrap(
        <g>
          <path d={cap({ top: 66, hl: 132, side: 206, peak: 0 })} fill={fill} />
          <path d="M146 96C190 70 258 84 276 150C240 118 190 118 146 150Z" fill={fill} />
          <path d="M160 100C196 82 242 90 262 126" stroke={light} strokeWidth="3.4" fill="none" opacity=".55" strokeLinecap="round" />
        </g>,
      )
    case 'long':
      return wrap(
        <g>
          <path d={cap({ top: 68, hl: 134, side: 214, peak: 0 })} fill={fill} />
          <path d="M200 70C170 96 148 120 124 168C150 140 176 124 200 110Z" fill={fill} />
          <path d="M156 100C186 80 232 84 256 104" stroke={light} strokeWidth="3.4" fill="none" opacity=".45" strokeLinecap="round" />
        </g>,
      )
    case 'curly':
      return wrap(
        <g fill={fill}>
          {Array.from({ length: 13 }, (_, i) => {
            const a = Math.PI * (0.96 - (i / 12) * 0.92)
            return <circle key={i} cx={200 + Math.cos(a) * 84} cy={172 - Math.sin(a) * 88} r={26 - (i % 3)} />
          })}
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (0.9 - (i / 8) * 0.8)
            return <circle key={`b${i}`} cx={200 + Math.cos(a) * 54} cy={168 - Math.sin(a) * 60} r="24" />
          })}
          {[150, 180, 214, 246].map((x, i) => <circle key={`f${i}`} cx={x} cy={124 + (i % 2) * 5} r="15" />)}
          <path d="M124 192C116 160 126 140 144 134C140 160 142 178 146 200Z" />
          <path d="M276 192C284 160 274 140 256 134C260 160 258 178 254 200Z" />
        </g>,
      )
    case 'braids':
      return wrap(
        <g>
          <path d={cap({ top: 70, hl: 128, side: 206, peak: 0 })} fill={fill} />
          <path d="M200 74V128" stroke={dark} strokeWidth="3" />
          <path d="M152 100C176 84 226 84 250 100" stroke={light} strokeWidth="3" fill="none" opacity=".4" />
        </g>,
      )
    case 'veilhat':
      return wrap(
        <g>
          <path d="M124 196C118 160 132 134 150 130L156 168 150 200ZM276 196C282 160 268 134 250 130L244 168 250 200Z" fill={fill} />
          <g transform="rotate(-6 200 120)">
            <path d="M118 128C118 66 282 66 282 128C282 142 118 142 118 128Z" fill="#0d0e12" />
            <path d="M118 128C118 142 282 142 282 128L282 136C282 152 118 152 118 136Z" fill="#050608" />
            <path d="M122 120C170 132 230 132 278 118" stroke="#7a1f2b" strokeWidth="7" fill="none" />
            <circle cx="262" cy="104" r="9" fill="#7a1f2b" /><circle cx="262" cy="104" r="3.5" fill="#d9a441" />
          </g>
          <path d="M126 140H274L268 236C240 246 160 246 132 236Z" fill="#050608" opacity=".24" />
          {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={140 + (i % 8) * 17 + (Math.floor(i / 8) % 2) * 8} cy={160 + Math.floor(i / 8) * 30} r="1.4" fill="#000" opacity=".55" />)}
        </g>,
      )
    case 'cap':
      return wrap(
        <g>
          <path d="M124 200C118 172 124 152 138 146L144 190ZM276 200C282 172 276 152 262 146L256 190Z" fill={fill} />
          <path d="M124 138C122 60 278 60 276 138Z" fill="#1c2a45" />
          <path d="M124 138C122 60 278 60 276 138" fill="none" stroke="#2c4066" strokeWidth="3" opacity=".7" />
          <path d="M118 128C160 144 240 144 282 128L284 144C240 164 160 164 116 144Z" fill="#111b30" />
          <path d="M104 140C150 170 250 170 296 140C290 158 250 184 200 184S110 158 104 140Z" fill="#0b1222" />
          <rect x="124" y="124" width="152" height="14" fill="#d9a441" opacity=".85" />
          <circle cx="200" cy="106" r="11" fill="#d9a441" stroke="#85632a" strokeWidth="2" /><path d="M194 106L200 98 206 106 200 114Z" fill="#7a1f2b" />
        </g>,
      )
    default:
      return wrap(<path d={cap({})} fill={fill} />)
  }
}

export { Hair }

/** Clothes and shoulders, drawn below the neck. */
export function Body({ spec, id, skin }) {
  const { type, color, accent, shirt, loose } = spec.clothes
  const dark = shade(color, 0.62)
  const light = shade(color, 1.25)
  const base = 'M10 480C14 404 70 354 138 340H262C330 354 386 404 390 480Z'
  const cloth = <path d={base} fill={`url(#${id}-cloth)`} />
  const skinNeck = skin[0]
  switch (type) {
    case 'suit':
      return (
        <g>
          {cloth}
          <path d="M162 338L200 420 238 338Z" fill={shirt} />
          <path d="M138 340L184 470 200 420 162 338Z" fill={dark} /><path d="M262 340L216 470 200 420 238 338Z" fill={dark} />
          <path d={loose ? 'M200 384l-12 14 4 70h16l6-70z' : 'M200 392l-9 12 8 62h2l8-62z'} fill={accent} transform={loose ? 'rotate(-6 200 390)' : undefined} />
          <path d={loose ? 'M188 376l12-8 14 8-4 14-10-3-10 3z' : 'M192 384l8-6 8 6-3 12h-10z'} fill={shade(accent, 0.7)} transform={loose ? 'rotate(-6 200 390)' : undefined} />
          {loose && <path d="M162 338L176 366 200 386 224 366 238 338" fill="none" stroke={shade(shirt, 0.7)} strokeWidth="2" />}
        </g>
      )
    case 'dress':
      return (
        <g>
          {cloth}
          <path d="M140 340C152 402 248 402 260 340Z" fill={skinNeck} />
          <path d="M140 340C152 402 248 402 260 340" fill="none" stroke={dark} strokeWidth="5" />
          <path d="M138 340C170 352 230 352 262 340" fill="none" stroke={light} strokeWidth="2" opacity=".4" />
        </g>
      )
    case 'whites':
      return (
        <g>
          <path d={base} fill={color} />
          <path d="M138 340L200 470 262 340 240 336 200 394 160 336Z" fill={shade(color, 0.86)} />
          {[400, 428, 456].map((y) => <circle key={y} cx="200" cy={y} r="4" fill="#8a8578" />)}
          <path d="M160 334C170 322 230 322 240 334L226 350H174Z" fill={shade(color, 0.92)} />
          <path d="M172 352L200 344 176 332ZM228 352L200 344 224 332Z" fill={accent} /><circle cx="200" cy="344" r="6" fill={shade(accent, 0.75)} />
        </g>
      )
    case 'crew':
      return (
        <g>
          {cloth}
          <path d="M156 338C168 372 232 372 244 338" fill={skinNeck} />
          <path d="M156 338C168 372 232 372 244 338" fill="none" stroke={dark} strokeWidth="6" />
          <rect x="296" y="412" width="44" height="10" rx="3" fill={accent} /><rect x="300" y="426" width="36" height="6" rx="3" fill={accent} opacity=".6" />
        </g>
      )
    case 'blazer':
      return (
        <g>
          {cloth}
          <path d="M162 338C170 352 230 352 238 338L238 372C230 384 170 384 162 372Z" fill={shirt} />
          <path d="M138 340L190 478 200 440 168 342Z" fill={dark} /><path d="M262 340L210 478 200 440 232 342Z" fill={dark} />
          <path d="M150 342L190 470M250 342L210 470" stroke={light} strokeWidth="2" opacity=".35" />
        </g>
      )
    case 'uniform':
      return (
        <g>
          {cloth}
          <path d="M150 338H250L246 366H154Z" fill="#101b30" /><path d="M150 338H250" stroke={accent} strokeWidth="3" />
          <path d="M138 340L200 480 262 340" fill="none" stroke={dark} strokeWidth="3" />
          {[392, 420, 448].map((y) => <circle key={y} cx="200" cy={y} r="5" fill={accent} stroke="#85632a" />)}
          <rect x="40" y="368" width="64" height="12" rx="3" fill={accent} transform="rotate(-18 72 374)" /><rect x="296" y="368" width="64" height="12" rx="3" fill={accent} transform="rotate(18 328 374)" />
          <circle cx="246" cy="394" r="9" fill={accent} /><path d="M242 394h8M246 390v8" stroke="#85632a" strokeWidth="1.5" />
        </g>
      )
    case 'cardigan':
      return (
        <g>
          {cloth}
          <path d="M150 338L200 468 250 338 238 334 200 410 162 334Z" fill={shirt} />
          <path d="M200 400V480" stroke={dark} strokeWidth="2" />
          {[420, 448].map((y) => <circle key={y} cx="200" cy={y} r="4.5" fill={shade(color, 0.5)} />)}
          <path d="M162 336C174 324 226 324 238 336L226 352H174Z" fill={shirt} />
          <path d="M150 340C160 350 170 352 178 350M250 340C240 350 230 352 222 350" stroke={dark} strokeWidth="2" fill="none" opacity=".5" />
        </g>
      )
    case 'tweed':
      return (
        <g>
          {cloth}
          {Array.from({ length: 36 }, (_, i) => <path key={i} d={`M${40 + (i % 9) * 38} ${372 + Math.floor(i / 9) * 26}l9 5`} stroke={light} strokeWidth="2" opacity=".28" />)}
          <path d="M162 338L200 400 238 338Z" fill={shirt} />
          <path d="M138 340L186 470 200 400 162 338Z" fill={dark} /><path d="M262 340L214 470 200 400 238 338Z" fill={dark} />
        </g>
      )
    case 'widow':
      return (
        <g>
          {cloth}
          <path d="M152 340C166 404 234 404 248 340Z" fill={skinNeck} />
          <path d="M152 340C166 404 234 404 248 340" fill="none" stroke="#050608" strokeWidth="5" />
          <path d="M146 342C158 372 242 372 254 342" fill="none" stroke={accent} strokeWidth="9" strokeDasharray="2 7" strokeLinecap="round" opacity=".7" />
        </g>
      )
    case 'waistcoat':
      return (
        <g>
          <path d={base} fill="#26283a" />
          <path d="M152 338L200 454 248 338 228 332 200 372 172 332Z" fill={shirt} />
          <path d="M150 338C150 410 168 470 200 480 232 470 250 410 250 338L226 400 200 372 174 400Z" fill={color} />
          {[410, 436, 462].map((y) => <circle key={y} cx="200" cy={y} r="3.6" fill={accent} />)}
          <path d="M166 420C186 446 214 446 234 420" stroke={accent} strokeWidth="2.4" fill="none" /><circle cx="234" cy="420" r="4" fill={accent} />
          <path d="M156 336L172 344 160 354ZM244 336L228 344 240 354Z" fill={shirt} stroke={shade(shirt, 0.7)} />
        </g>
      )
    case 'offshoulder':
      return (
        <g>
          <path d="M12 480C16 410 66 366 124 352C160 392 240 392 276 352C334 366 384 410 388 480Z" fill={skinNeck} />
          <path d="M12 480C16 420 66 392 130 388C170 410 230 410 270 388C334 392 384 420 388 480Z" fill={color} />
          <path d="M130 388C170 410 230 410 270 388" fill="none" stroke={accent} strokeWidth="3" opacity=".8" />
          <path d="M150 346C176 372 224 372 250 346" fill="none" stroke={accent} strokeWidth="1.6" opacity=".7" />
        </g>
      )
    default:
      return cloth
  }
}

/** Beards and stubble sit under the mouth; moustaches sit over it. */
export function FacialHair({ spec, id, layer }) {
  const f = spec.facial
  if (!f) return null
  const c = f.color
  const my = spec.mouth.y
  const fw = spec.fw
  const under = f.type === 'beard' || f.type === 'stubble'
  if (under && layer !== 'under') return null
  if (!under && layer !== 'over') return null
  const mouthHole = `M${200 - 34} ${my}a34 17 0 1 0 68 0a34 17 0 1 0 -68 0Z`
  const beard = `M${200 - fw - 4} 212L${200 - fw + 5} 214C${200 - fw + 10} 246 ${200 - 52} 250 ${200 - 36} 248C${200 - 20} 240 ${200 + 20} 240 ${200 + 36} 248C${200 + 52} 250 ${200 + fw - 10} 246 ${200 + fw - 5} 214L${200 + fw + 4} 212L${200 + fw + 6} 340L${200 - fw - 6} 340Z${mouthHole}`
  switch (f.type) {
    case 'stubble':
      return (
        <g clipPath={`url(#${id}-face)`}>
          <path d={beard} fillRule="evenodd" fill={`url(#${id}-dots)`} opacity=".85" />
          <path d={beard} fillRule="evenodd" fill={c} opacity=".22" />
        </g>
      )
    case 'beard':
      return (
        <g clipPath={`url(#${id}-face)`}>
          <path d={beard} fillRule="evenodd" fill={c} opacity=".92" />
          <path d={beard} fillRule="evenodd" fill={`url(#${id}-dots)`} opacity=".5" />
        </g>
      )
    case 'chevron':
      return <path d={`M162 ${my - 14}C176 ${my - 28} 192 ${my - 24} 200 ${my - 18}C208 ${my - 24} 224 ${my - 28} 238 ${my - 14}C228 ${my - 4} 210 ${my - 8} 200 ${my - 8}C190 ${my - 8} 172 ${my - 4} 162 ${my - 14}Z`} fill={c} />
    case 'pencil':
      return <path d={`M170 ${my - 15}C184 ${my - 23} 194 ${my - 21} 200 ${my - 19}C206 ${my - 21} 216 ${my - 23} 230 ${my - 15}C218 ${my - 18} 208 ${my - 17} 200 ${my - 16}C192 ${my - 17} 182 ${my - 18} 170 ${my - 15}Z`} fill={c} />
    case 'walrus':
      return <path d={`M150 ${my - 6}C158 ${my - 30} 188 ${my - 30} 200 ${my - 20}C212 ${my - 30} 242 ${my - 30} 250 ${my - 6}C242 ${my + 8} 224 ${my + 4} 212 ${my - 6}C206 ${my - 9} 194 ${my - 9} 188 ${my - 6}C176 ${my + 4} 158 ${my + 8} 150 ${my - 6}Z`} fill={c} stroke={shade(c, 0.7)} strokeWidth="1.4" />
    default:
      return null
  }
}

export function Glasses({ spec }) {
  const g = spec.glasses
  if (!g) return null
  const { gap, y, w } = spec.eye
  const cx1 = 200 - gap
  const cx2 = 200 + gap
  const r = g.small ? w + 4 : w + 8
  const frame = { fill: 'none', stroke: g.color, strokeWidth: g.type === 'pince' ? 2.2 : 3.4 }
  const lens = { fill: '#cfe4ee', opacity: 0.1 }
  if (g.type === 'rect') {
    const hw = w + 11
    const hh = 15
    return (
      <g>
        {[cx1, cx2].map((cx) => (
          <g key={cx}>
            <rect x={cx - hw} y={y - hh} width={hw * 2} height={hh * 2} rx="6" {...lens} />
            <rect x={cx - hw} y={y - hh} width={hw * 2} height={hh * 2} rx="6" {...frame} />
            <path d={`M${cx - hw + 5} ${y - 6}L${cx - hw + 15} ${y - hh + 4}`} stroke="#fff" strokeWidth="2" opacity=".35" />
          </g>
        ))}
        <path d={`M${cx1 + hw} ${y - 4}Q200 ${y - 10} ${cx2 - hw} ${y - 4}M${cx1 - hw} ${y - 4}L${cx1 - hw - 16} ${y - 10}M${cx2 + hw} ${y - 4}L${cx2 + hw + 16} ${y - 10}`} {...frame} />
      </g>
    )
  }
  return (
    <g>
      {[cx1, cx2].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={y} r={r} {...lens} /><circle cx={cx} cy={y} r={r} {...frame} />
          <path d={`M${cx - r * 0.6} ${y - r * 0.5}A${r * 0.8} ${r * 0.8} 0 0 1 ${cx - r * 0.1} ${y - r * 0.8}`} stroke="#fff" strokeWidth="2" fill="none" opacity=".4" />
        </g>
      ))}
      <path d={`M${cx1 + r} ${y - 2}Q200 ${y - 9} ${cx2 - r} ${y - 2}`} {...frame} />
      {g.type === 'pince' ? (
        <path d={`M${cx2 + r - 2} ${y + 4}C${cx2 + 40} ${y + 40} ${cx2 + 50} ${y + 90} ${cx2 + 30} ${y + 130}`} stroke={g.color} strokeWidth="1.5" fill="none" opacity=".8" />
      ) : (
        <path d={`M${cx1 - r} ${y - 2}L${cx1 - r - 14} ${y - 6}M${cx2 + r} ${y - 2}L${cx2 + r + 14} ${y - 6}`} {...frame} />
      )}
    </g>
  )
}

export function Extras({ spec }) {
  const { extras, eye } = spec
  const earY = 216
  const fw = spec.fw
  return (
    <>
      {extras.includes('earrings') && [-1, 1].map((s) => <g key={s}><circle cx={200 + s * (fw + 4)} cy={earY + 18} r="4.6" fill="#efe8d8" /><circle cx={200 + s * (fw + 4) - 1} cy={earY + 17} r="1.4" fill="#fff" /></g>)}
      {extras.includes('headset') && (
        <g fill="none" stroke="#14151a" strokeWidth="7" strokeLinecap="round">
          <path d={`M${200 - fw - 6} 214C${200 - fw - 14} 130 160 74 200 74S${200 + fw + 14} 130 ${200 + fw + 6} 214`} />
          <path d={`M${200 - fw - 6} 204V236`} strokeWidth="14" />
          <path d={`M${200 - fw - 6} 236C${200 - fw} 280 ${200 - 40} 288 ${200 - 24} 276`} strokeWidth="3.5" stroke="#2a2d36" />
          <circle cx="178" cy="276" r="5" fill="#14151a" stroke="#14151a" strokeWidth="2" />
        </g>
      )}
      {extras.includes('freckles') && <g fill="#a86a4a" opacity=".5">{[[160, 232], [168, 226], [176, 234], [226, 232], [234, 226], [242, 234], [200, 224], [190, 230], [210, 230], [152, 226], [248, 226]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" />)}</g>}
    </>
  )
}

/** Things that hang over the clothes. */
export function BodyExtras({ spec }) {
  const { extras } = spec
  return (
    <>
      {extras.includes('pearls') && (
        <g>
          {Array.from({ length: 15 }, (_, i) => {
            const t = i / 14
            const x = 154 + t * 92
            const y = 338 + Math.sin(t * Math.PI) * 38
            return <g key={i}><circle cx={x} cy={y} r="5.4" fill="#efe8d8" /><circle cx={x - 1.6} cy={y - 1.6} r="1.7" fill="#fff" opacity=".9" /></g>
          })}
        </g>
      )}
      {extras.includes('brooch') && <g><circle cx="262" cy="396" r="9" fill="#d9a441" /><circle cx="262" cy="396" r="4" fill="#7a1f2b" /><circle cx="260" cy="394" r="1.4" fill="#fff" opacity=".8" /></g>}
      {extras.includes('stethoscope') && (
        <g fill="none" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round">
          <path d="M150 330C140 400 170 450 200 452C230 450 260 400 250 330" />
          <path d="M200 452V474" />
          <circle cx="200" cy="480" r="13" fill="#9aa0a6" stroke="#5c6168" strokeWidth="3" />
        </g>
      )}
    </>
  )
}
