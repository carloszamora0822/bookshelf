// Lucide-style line icons, 1.6 stroke
const Ico = ({ d, size = 20, fill = "none", stroke = "currentColor", sw = 1.6, children, viewBox = "0 0 24 24", style }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Search:    (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ico>,
  Plus:      (p) => <Ico {...p} d="M12 5v14M5 12h14" />,
  Minus:     (p) => <Ico {...p} d="M5 12h14" />,
  X:         (p) => <Ico {...p} d="M18 6 6 18M6 6l12 12" />,
  Check:     (p) => <Ico {...p} d="m5 12 5 5L20 7" />,
  ArrowLeft: (p) => <Ico {...p} d="M19 12H5M12 19l-7-7 7-7" />,
  ArrowRight:(p) => <Ico {...p} d="M5 12h14M12 5l7 7-7 7" />,
  ChevDown:  (p) => <Ico {...p} d="m6 9 6 6 6-6" />,
  ChevRight: (p) => <Ico {...p} d="m9 6 6 6-6 6" />,
  ChevUp:    (p) => <Ico {...p} d="m6 15 6-6 6 6" />,
  More:      (p) => <Ico {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></Ico>,
  Bookmark:  (p) => <Ico {...p} d="M6 4h12v17l-6-4-6 4z" />,
  BookmarkFill: (p) => <Ico {...p} fill="currentColor" stroke="currentColor"><path d="M6 4h12v17l-6-4-6 4z" /></Ico>,
  Note:      (p) => <Ico {...p}><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M15 3v5h5"/></Ico>,
  List:      (p) => <Ico {...p} d="M4 6h16M4 12h16M4 18h16" />,
  Grid:      (p) => <Ico {...p}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></Ico>,
  Sun:       (p) => <Ico {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Ico>,
  Moon:      (p) => <Ico {...p} d="M21 13.5A8.5 8.5 0 1 1 10.5 3a6.5 6.5 0 0 0 10.5 10.5z" />,
  Settings:  (p) => <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Ico>,
  Brightness:(p) => <Ico {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Ico>,
  Layers:    (p) => <Ico {...p}><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></Ico>,
  Pencil:    (p) => <Ico {...p} d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />,
  Trash:     (p) => <Ico {...p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Ico>,
  Upload:    (p) => <Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></Ico>,
  File:      (p) => <Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></Ico>,
  Tag:       (p) => <Ico {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/></Ico>,
  PageMode:  (p) => <Ico {...p}><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/></Ico>,
  Scroll:    (p) => <Ico {...p}><rect x="5" y="3" width="14" height="6" rx="1"/><rect x="5" y="11" width="14" height="6" rx="1"/><path d="M9 19h6"/></Ico>,
  Book:      (p) => <Ico {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5a2.5 2.5 0 0 0 0 5H20"/></Ico>,
  BookOpen:  (p) => <Ico {...p}><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></Ico>,
  ArrowUpRight: (p) => <Ico {...p} d="M7 17 17 7M8 7h9v9" />,
  Play:      (p) => <Ico {...p} fill="currentColor" stroke="none"><path d="M6 4v16l14-8z"/></Ico>,
  Sort:      (p) => <Ico {...p}><path d="M3 7h13M3 12h9M3 17h5"/><path d="m17 14 3 3 3-3M20 7v10"/></Ico>,
  Phone:     (p) => <Ico {...p}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></Ico>,
  Tablet:    (p) => <Ico {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/></Ico>,
  Mail:      (p) => <Ico {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Ico>,
  LogOut:    (p) => <Ico {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></Ico>,
  Eye:       (p) => <Ico {...p}><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></Ico>,
  Wifi:      (p) => <Ico {...p} size={p?.size ?? 15}><path d="M2 8.5a15 15 0 0 1 20 0M5 11.5a11 11 0 0 1 14 0M8.5 14.5a6 6 0 0 1 7 0"/><circle cx="12" cy="18" r="1.1" fill="currentColor" stroke="none"/></Ico>,
  Battery:   (p) => <Ico {...p} viewBox="0 0 26 14" sw={1.4}><rect x="0.7" y="0.7" width="22" height="12.6" rx="3"/><rect x="2.5" y="2.5" width="18.4" height="9" rx="1.4" fill="currentColor" stroke="none"/><rect x="23.5" y="4.5" width="2" height="5" rx="1" fill="currentColor" stroke="none"/></Ico>,
  Signal:    (p) => <Ico {...p} sw={0} fill="currentColor" stroke="none"><rect x="1" y="9" width="3" height="6" rx="0.6"/><rect x="6" y="6" width="3" height="9" rx="0.6"/><rect x="11" y="3" width="3" height="12" rx="0.6"/><rect x="16" y="1" width="3" height="14" rx="0.6"/></Ico>,
  Compass:   (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 6-6 2 2-6z"/></Ico>,
  Image:     (p) => <Ico {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-4-4-7 7"/></Ico>,
  Trash2:    (p) => <Ico {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></Ico>,
  Drag:      (p) => <Ico {...p} sw={0} fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></Ico>,
};

window.Icons = Icons;
