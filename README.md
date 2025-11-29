# My PT - Physical Therapy Tracker PWA

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.5-orange.svg)](https://kit.svelte.dev/)
[![Node.js: >=18.0.0](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A privacy-focused Progressive Web App for tracking physical therapy exercises and maintaining consistent rehabilitation routines. All data stays on your device—no server, no tracking, no accounts.

This app is intended as an additional aid beyond those provided by medical professionals. The audience is primarily people with recurring or chronic physical issues that require long-term physical therapy regimen, continued at home beyond when they are under the direct care of a therapist.

---

## App Screenshots

<div align="center">
  <table>
    <tr valign="top">
      <td><img src="./docs/screenshots/Screenshot_Today_View.png" width="180" alt="Today View"/></td>
      <td><img src="./docs/screenshots/Screenshot_Exercise_Library.png" width="180" alt="Exercise Library"/></td>
      <td><img src="./docs/screenshots/Screenshot_Play_Session.png" width="180" alt="Active Session Playback"/></td>
    </tr>
    <tr valign="top">
      <td><img src="./docs/screenshots/Screenshot_Edit_Exercise.png" width="180" alt="Create Exercise"/></td>
      <td><img src="./docs/screenshots/Screenshot_Journal.png" width="180" alt="Session Journal"/></td>
      <td><img src="./docs/screenshots/Screenshot_Settings_1.png" width="180" alt="Settings"/></td>
    </tr>
  </table>
</div>

---

## Core Features

### Exercise & Session Management
- **Custom Exercise Library**: Create duration-based or rep/set-based exercises with instructions
- **Session Builder**: Group exercises into reusable workout routines
- **Flexible Organization**: Search, sort, and reorder exercises and sessions

### Guided Session Playback
- **Real-Time Timers**: Countdown timers for duration exercises, rep counters for strength exercises
- **Audio & Haptic Cues**: Distinct tones and vibrations for exercise transitions, rep timing, and rest periods
- **Auto-Rest Between Sets**: Configurable automatic rest timers between sets
- **Screen Wake Lock**: Screen stays on during active sessions
- **Full Playback Controls**: Pause, resume, skip, go back, save progress, or finish session

### Progress Tracking
- **Session Journal**: Complete history of all completed sessions
- **Statistics Dashboard**: Total sessions, weekly, and monthly counts
- **Activity Calendar**: Visual calendar showing completion patterns
- **Session Details**: Review exercise-by-exercise performance

### Customization
- **Timing Preferences**: Configure countdown delays, rest periods, and auto-rest behavior
- **Audio Settings**: Master volume, countdown tones, and preview sounds
- **Theme Options**: Light, dark, or auto (follows system preference)
- **Data Management**: Export/import for backups and device transfers

### Privacy & Offline
- **Local-First**: All data stored on device using IndexedDB
- **Fully Offline**: Works completely offline after installation
- **No Tracking**: No accounts, no servers, no data collection
- **Data Portability**: Export/import your complete database

---

## Quick Start

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/NateEaton/my-pt-pwa.git
   cd my-pt-pwa
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

### Deployment

The app generates a static site in `build/` directory. Deploy to any static hosting:

**GitHub Pages:**
```bash
./deploy.sh
```

**Netlify / Vercel:**
- Build command: `npm run build`
- Publish directory: `build`

**Firebase Hosting:**
```bash
npm run build
firebase deploy
```

### Installing as PWA

Once deployed via HTTPS, browsers will prompt to install as a standalone app.

---

## Architecture Overview

### Application Structure

```
my-pt-pwa/
├── src/
│   ├── routes/              # SvelteKit pages (today, journal, play, settings)
│   ├── lib/
│   │   ├── components/      # Reusable UI components
│   │   ├── stores/          # Svelte stores (state management)
│   │   ├── services/        # Business logic (PTService, AudioService)
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Helper functions
│   ├── app.html             # HTML template
│   └── app.css              # Global styles
├── static/                  # Static assets (icons, fonts, manifest)
└── build/                   # Production build output
```

### Data Flow

- **UI Components** → User interactions
- **Svelte Stores** → Reactive state management
- **PTService** → Business logic and CRUD operations
- **IndexedDB** → Persistent local storage
- **Service Worker** → Offline support and PWA features

### Key Design Patterns

- **Local-First Architecture**: All data operations use client-side IndexedDB
- **Reactive State Management**: Svelte stores for reactive data flow
- **Component-Based UI**: Reusable components with clear separation of concerns
- **Progressive Enhancement**: Works in browser, enhanced when installed as PWA

---

## Technology Stack

### Frontend
- **[SvelteKit](https://kit.svelte.dev/)** (v2.5) - Full-stack framework with SSG
- **[Svelte](https://svelte.dev/)** (v4.2) - Reactive UI framework
- **[TypeScript](https://www.typescriptlang.org/)** (v5.0) - Type-safe development

### Data & Storage
- **IndexedDB** - Client-side persistent storage
- **Custom Service Layer** - Type-safe CRUD operations

### Build & Development
- **[Vite](https://vitejs.dev/)** (v5.2) - Build tool and dev server
- **[@sveltejs/adapter-static](https://kit.svelte.dev/docs/adapter-static)** - Static site generation
- **[@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/)** - PWA integration with Workbox

### PWA Features
- **Service Worker** - Offline support and automatic updates
- **Web App Manifest** - Installable with custom icons
- **Wake Lock API** - Screen stays on during sessions
- **Vibration API** - Haptic feedback for exercise cues

### UI/UX
- **Material Icons** - Consistent iconography
- **CSS Custom Properties** - Themeable design system
- **Mobile-First Design** - Optimized for touch interfaces

---

## Data Privacy & Security

### Local-Only Storage
- **No Server Communication**: All data stays on your device
- **No Tracking**: No cookies, analytics, or third-party services
- **No Accounts**: No sign-up or login required

### Data Ownership
- **Full Control**: All data remains on your device
- **Export Anytime**: Download complete database as JSON
- **Import Capability**: Restore from backup files
- **Data Portability**: Move data between devices

### Recommendations
- **Regular Backups**: Export your data regularly via Settings → Data Management
- **Secure Storage**: Store backup files securely
- **HTTPS Only**: Access via HTTPS (enforced in production)
- **Private Browsing**: Note that data will be cleared when private session ends

---

## Development

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Make changes and test locally
5. Type checking: `npm run check`
6. Build test: `npm run build`

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript and Svelte type checking |
| `npm run check:watch` | Type checking in watch mode |

### Contributing

While this is primarily a personal project, suggestions and feedback are welcome. Please open an issue for bugs or feature ideas.

---

## Acknowledgments

### Built With
- **[SvelteKit](https://kit.svelte.dev/)** - Full-stack framework for building this PWA
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Material Icons](https://fonts.google.com/icons)** - Icon library

### Development
This project was developed with assistance from AI tools including **Claude**, **AI Studio** (Google) and **ChatGPT** (OpenAI) following best practices in modern web development. The underlying concept, architecture decisions, implementation and testing were performed by the developer.

### Inspiration
Created to support individuals undergoing physical therapy who need a simple, reliable way to track their home exercise programs without sacrificing privacy or requiring internet connectivity.

---

## License

This project is licensed under the **GNU General Public License v3.0 or later**.

See [LICENSE](LICENSE) for the full license text.

---

**Made with care for better rehabilitation outcomes**
