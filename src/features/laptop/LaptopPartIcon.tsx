export function LaptopPartIcon({ name }: { name: string }) {
  if (['board', 'ram', 'ssd', 'cooler', 'case'].includes(name))
    return <img src={`/thumbnails/${name}.svg`} alt="" loading="lazy" />;
  return (
    <svg className="laptop-part-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none">
      <rect width="64" height="64" rx="9" fill="#172b40" />
      <g stroke="#b9e2fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {name === 'battery' ? (
          <>
            <rect x="10" y="20" width="42" height="27" rx="3" fill="#325677" />
            <path d="M53 27h4v12h-4M29 25l-6 10h8l-3 8 11-13h-9l3-5" />
          </>
        ) : name === 'screen' ? (
          <>
            <rect x="10" y="12" width="44" height="32" rx="3" fill="#32658a" />
            <path d="M23 52h18M32 44v8M16 18h32" />
          </>
        ) : name === 'keyboard' ? (
          <>
            <path d="M12 22h40l5 24H7z" fill="#325677" />
            {[27, 34, 41].map((y) => (
              <path key={y} d={`M16 ${y}h4m5 0h4m5 0h4m5 0h4`} />
            ))}
          </>
        ) : name === 'cable' ? (
          <>
            <path d="M17 25v12a10 10 0 0020 0v-8a8 8 0 0116 0v7" stroke="#f0c573" strokeWidth="4" />
            <rect x="10" y="14" width="14" height="13" rx="2" fill="#56708b" />
            <path d="M13 14v-4m7 4v-4M48 37h10v10H48z" />
          </>
        ) : name === 'screw' ? (
          <>
            <path d="M26 24v29l12-5V24M26 31l12-4m-12 12l12-4m-12 12l12-4" fill="#56708b" />
            <ellipse cx="32" cy="20" rx="15" ry="8" fill="#7897ac" />
            <path d="M25 20h14M32 16v8" stroke="#172b40" />
          </>
        ) : name === 'speaker' ? (
          <>
            <rect x="19" y="10" width="27" height="44" rx="5" fill="#325677" />
            <circle cx="32" cy="37" r="9" />
            <circle cx="32" cy="20" r="4" />
          </>
        ) : (
          <>
            <rect x="11" y="15" width="42" height="35" rx="4" fill="#325677" />
            <path d="M11 40h42M32 40v10" />
          </>
        )}
      </g>
    </svg>
  );
}
