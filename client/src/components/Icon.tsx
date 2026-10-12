const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M9.5 19.5v-6h5v6',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z',
  check: 'M9 11.5l2.5 2.5L16 9.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  inbox: 'M4 13.5 6.5 5h11L20 13.5M4 13.5V19h16v-5.5M4 13.5h4.5l1 2.5h5l1-2.5H20',
  clock: 'M12 7.5V12l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  building: 'M5 20V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V20M15 9.5h3a1 1 0 0 1 1 1V20M3 20h18M8.5 8.5h3M8.5 12h3M8.5 15.5h3',
  ticket: 'M4 8.5V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4.5a2.5 2.5 0 0 0 0-5ZM14 5v14',
  megaphone: 'M4 10v4h3l6 4V6l-6 4H4Zm12.5-1a4 4 0 0 1 0 6M7 14v4.5h2.5',
  chart: 'M4 20V4M4 20h16M8.5 16v-5M13 16V8M17.5 16v-8.5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.2A6 6 0 0 1 21 20',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  logout: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  alert: 'M12 9v4.5M12 17h.01M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z',
  pin: 'M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  cap: 'M12 4 2 9l10 5 8-4v6M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5',
  shield: 'M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.500 7-5 7-9.500V6l-7-3Zm-3 9 2.200 2.200L15.500 10',
  refresh: 'M4 12a8 8 0 0 1 14-5.300L20 8.500M20 4v4.500h-4.500M20 12a8 8 0 0 1-14 5.300L4 15.500M4 20v-4.500h4.500',
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
