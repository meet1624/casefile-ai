/** A rough-edged ink look for stamps. Rendered once; elements reference it by id. */
export default function InkFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <filter id="cf-ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" result="d" />
        <feComponentTransfer in="n" result="speck"><feFuncA type="discrete" tableValues="1 1 1 1 1 0.55 1 1" /></feComponentTransfer>
        <feComposite in="d" in2="speck" operator="in" />
      </filter>
    </svg>
  )
}
