# Zahid Hasan — drive-through 3D portfolio

Game-style portfolio built with Three.js + cannon-es. Drive a racing car (or rally hatch, dune buggy, ZH.NET van; press V) around a floating
"integration island". The amber loop road is the career timeline (2018 → now); every project,
skill, award and contact in the CV is a physical place on it.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy to GitHub Pages, Netlify, ...)
```

## Controls
V garage · WASD / arrows drive · Shift boost · Space hop · H horn · X handbrake · Q/E or drag orbit camera ·
wheel zoom · M fast travel · C plain-text CV · T tidy props · R respawn · N mute.
Touch: on-screen joystick + BOOST/HOP.

## How CV data maps to 3D
| CV item | 3D object |
|---|---|
| Global Mobile Recharge (23 APIs) | tower with 23 orbiting satellites |
| WASA Visitor Mgmt (WPF) | boom-barrier gate that lifts as you approach |
| Transcom Ecommerce | stall + pushable parcels |
| Telepay | phone with live signal rings |
| Laxic / OnlyOffice | document stack + AI crystal |
| Attendance & Sales portal | working clock tower + animated sales bars |
| ERP Sync service | conveyor moving Product / Order / Stock crates, Windows-service gear |
| Enzan Bridge Assets | drivable suspension bridge (ASP.NET ↔ Kotlin) |
| Enzan Inspection (WinForms) | scanner sweeping a model bridge + WinForms window |
| Meter Reading (46 engineers) | giant smart meter, 46 tiny engineers, Ocelot gateway arch |
| FBSC OneTech (SSIS) | torii gate + two databases linked by a data pipe |
| Skills matrix | 15 knock-down towers, height = rating |
| Best Performer 2023-24 | trophy podium with confetti |
| Exploring K8s / Kong / MCP / RAG | "under construction" lab |
| Education | BUBT + SIMT buildings |

## Edit content
All text lives in `src/data.js`. Station layout/angles are there too; 3D builders are in `src/props.js`.

## Extras
- **Packets**: 45 collectible data packets along the road. Deliver them all to unlock the secret *Golden Packet* car.
- **Boost pads** on the road, a **start line** and **lap timer** (best lap saved locally), **skid marks**.
- **Time of day** (L): night (default), golden hour, midday.
- **Dev terminal** (`` ` ``): `help`, `whoami`, `projects`, `skills`, `goto <id>`, `car`, `sky`, `quality`, `stats`... and a `sudo` easter egg.
- **Graphics** (G): low/high; auto-drops to low on slow machines.
- **Cars** (V / Garage): Apex GT, Rally Hatch, Dune Buggy, ZH.NET Van.
