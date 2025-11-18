# My PT - Physical Therapy Exercise Tracker

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.5-orange.svg)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js: >=18.0.0](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-success.svg)](https://web.dev/progressive-web-apps/)

A simple, privacy-focused Progressive Web App (PWA) designed to help you track physical therapy exercises and maintain consistent rehabilitation routines. All data stays on your device—no server, no tracking, no accounts required.

---

## 📸 Screenshots

<!-- Carousel Placeholder -->
<div align="center">
  <p><em>Screenshots coming soon...</em></p>
  <!--
  Future: Add screenshot carousel here showing:
  - Exercise library view
  - Session management
  - Guided session player with timer
  - Journal/history view
  - Settings customization
  -->
</div>

---

## ✨ Features

### 📋 Exercise & Session Management
- **Exercise Library**: Create and manage custom exercises with duration or rep-based tracking
- **Session Builder**: Build reusable workout routines by combining exercises
- **Exercise Details**: Set timing, reps, rest periods, and add notes for each exercise
- **Flexible Organization**: Edit, delete, and organize your exercises and sessions

### ▶️ Guided Session Playback
- **Interactive Timer**: Real-time countdown for duration-based exercises
- **Rep Tracking**: Manual rep counter for strength exercises
- **Rest Periods**: Automatic rest timers between exercises with visual and audio cues
- **Auto-scroll**: Active exercise automatically scrolls into view during long sessions
- **Session Progress**: Visual indicators show completed exercises and overall progress
- **Pause & Resume**: Full control over session pacing

### 📊 Progress Tracking
- **Session Journal**: Complete history of all completed sessions
- **Statistics Dashboard**: View total sessions, this week, and this month counts
- **Activity Calendar**: Visual calendar showing session completion patterns
- **Session Details**: Review exercise-by-exercise performance from past sessions

### ⚙️ Customization & Settings
- **Timing Preferences**:
  - Countdown start delay
  - Get-ready period before exercises
  - Default rest period duration
- **Audio Cues**: Toggle sound notifications for transitions
- **Theme**: Modern, clean interface with responsive design
- **Data Management**: Export and import data for backups or device transfers

### 🔒 Privacy & Offline
- **Local-First**: All data stored on your device using IndexedDB
- **No Server Required**: Completely offline-capable after installation
- **No Account Needed**: No sign-up, no login, no personal information collected
- **Privacy-Focused**: Your health data never leaves your device
- **Data Portability**: Export/import functionality gives you full control

---

## 🏗️ Architecture

### Application Structure

```
my-pt-pwa/
├── src/
│   ├── routes/              # SvelteKit pages
│   │   ├── +layout.svelte   # Root layout with navigation
│   │   ├── +page.svelte     # Home/Dashboard
│   │   ├── exercises/       # Exercise library
│   │   ├── sessions/        # Session management
│   │   ├── play/            # Session player
│   │   ├── journal/         # Session history
│   │   └── settings/        # App settings
│   ├── lib/
│   │   ├── components/      # Reusable UI components
│   │   ├── stores/          # Svelte stores (state management)
│   │   ├── db/              # IndexedDB schemas and operations
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Helper functions
│   ├── app.html             # HTML template
│   └── app.css              # Global styles
├── static/                  # Static assets (icons, manifest)
├── build/                   # Production build output
└── .svelte-kit/             # SvelteKit cache
```

### Data Flow

1. **UI Components** → User interactions trigger actions
2. **Svelte Stores** → Manage application state
3. **Database Layer** → CRUD operations on IndexedDB
4. **IndexedDB** → Persistent browser storage
5. **Service Worker** → Enables offline functionality and PWA features

### Key Design Patterns

- **Local-First Architecture**: All data operations use client-side IndexedDB
- **Reactive State Management**: Svelte stores provide reactive data flow
- **Component-Based UI**: Reusable components with clear separation of concerns
- **Progressive Enhancement**: Works in browser, enhanced when installed as PWA

---

## 🛠️ Technology Stack

### Frontend Framework
- **[SvelteKit](https://kit.svelte.dev/)** (v2.5.12) - Full-stack framework with SSG
- **[Svelte](https://svelte.dev/)** (v4.2.19) - Reactive UI framework
- **[TypeScript](https://www.typescriptlang.org/)** (v5.0) - Type-safe development

### Data & Storage
- **IndexedDB** - Client-side structured storage
- **Custom DB Layer** - Type-safe CRUD operations for exercises, sessions, and journal entries

### Build & Development
- **[Vite](https://vitejs.dev/)** (v5.2.11) - Fast build tool and dev server
- **[@sveltejs/adapter-static](https://kit.svelte.dev/docs/adapter-static)** - Static site generation for deployment
- **[@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/)** - PWA integration with Workbox

### PWA Features
- **Service Worker** - Offline support and caching
- **Web App Manifest** - Installable app with custom icons
- **Responsive Design** - Mobile-first, works on all screen sizes

### UI/UX
- **Material Icons** - Icon library for consistent design
- **CSS Custom Properties** - Themeable design system
- **Mobile-First Design** - Optimized for touch interfaces

---

## 🚀 Installation & Deployment

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/NateEaton/my-pt-pwa.git
   cd my-pt-pwa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Build for Production

The app supports two build modes:

#### Development Build
```bash
npm run build:dev
```
- Uses development environment variables
- Includes source maps for debugging
- Suitable for testing in production-like environment

#### Production Build
```bash
npm run build
```
- Optimized bundle size
- Minified assets
- Production service worker
- Ready for deployment

### Deployment

The app generates a static site in the `build/` directory. Deploy to any static hosting service:

#### GitHub Pages
```bash
# After building
./deploy.sh
```

#### Netlify / Vercel
1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Deploy

#### Firebase Hosting
```bash
npm run build
firebase deploy
```

### PWA Installation

Once deployed and accessed via HTTPS:
1. Visit the deployed URL in a supported browser
2. Browser will prompt to "Install" or "Add to Home Screen"
3. Accept the prompt to install as a standalone app
4. App will appear on your device like a native application

---

## 🔒 Data Privacy & Security

### Local-Only Storage
- **No Server Communication**: The app never sends data to any external servers
- **IndexedDB**: All data stored locally in your browser's IndexedDB
- **No Cookies**: No tracking cookies or analytics
- **No Third-Party Services**: No external APIs or services used

### Data Ownership
- **Full Control**: All data remains on your device
- **Export Anytime**: Export your complete database to JSON
- **Import Capability**: Restore data from backup files
- **Data Portability**: Move data between devices using export/import

### Browser Storage
- **Persistent Storage**: Data persists across browser sessions
- **Storage Quota**: Uses browser's available storage (typically several GB)
- **Private Browsing**: Data will be cleared when private session ends
- **Clear Data**: Standard browser "Clear Site Data" will remove all app data

### Recommendations
- **Regular Backups**: Use the Settings → Data Management → Export feature regularly
- **Secure Backups**: Store exported backup files securely
- **Browser Updates**: Keep your browser updated for latest security patches
- **HTTPS Only**: Always access via HTTPS (enforced in production builds)

---

## 💻 Development

### Getting Started

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Start dev server**: `npm run dev`
4. **Make changes** and test locally
5. **Type checking**: `npm run check`
6. **Build test**: `npm run build:dev`

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development environment |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript and Svelte type checking |
| `npm run check:watch` | Run type checking in watch mode |

### Key Development Files

- **`src/lib/db/schema.ts`** - Database schemas and type definitions
- **`src/lib/db/exercises.ts`** - Exercise CRUD operations
- **`src/lib/db/sessions.ts`** - Session CRUD operations
- **`src/lib/db/journal.ts`** - Journal/history operations
- **`src/lib/stores/`** - Application state management
- **`vite.config.ts`** - Build configuration and PWA settings
- **`svelte.config.js`** - SvelteKit configuration

### Adding Features

#### New Exercise Type
1. Update `src/lib/types/exercise.ts` with new type definition
2. Modify `src/lib/db/exercises.ts` for CRUD operations
3. Update UI components in `src/routes/exercises/`
4. Handle new type in session player at `src/routes/play/+page.svelte`

#### Custom Timer Logic
1. Modify `src/routes/play/+page.svelte` timer implementation
2. Update settings in `src/routes/settings/+page.svelte`
3. Store preferences in `src/lib/stores/settings.ts`

#### New Statistics
1. Add calculation logic in `src/routes/journal/+page.svelte`
2. Query data from `src/lib/db/journal.ts`
3. Update UI to display new metrics

### Database Schema

The app uses IndexedDB with the following object stores:

- **exercises**: Exercise definitions (name, type, timing, notes)
- **sessions**: Session templates (name, exercise list)
- **journal**: Completed session instances (date, duration, exercises performed)
- **settings**: User preferences (timers, audio, defaults)

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 or later**.

```
My PT - Physical Therapy Exercise Tracker PWA
Copyright (C) 2025 Nathan Eaton Jr.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

See [LICENSE](LICENSE) for the full license text.

---

## 🙏 Acknowledgments

### Built With
- **SvelteKit** - The amazing full-stack framework
- **TypeScript** - For type-safe development
- **Vite** - For lightning-fast builds
- **Material Icons** - For beautiful iconography

### Inspiration
This app was created to support individuals undergoing physical therapy who need a simple, reliable way to track their home exercise programs without sacrificing privacy or requiring internet connectivity.

### Contributing
While this is primarily a personal project, suggestions and feedback are welcome. Please feel free to open an issue if you encounter bugs or have feature ideas.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/NateEaton/my-pt-pwa/issues)
- **License**: GPL-3.0-or-later
- **Author**: Nathan Eaton Jr.

---

**Made with ❤️ for better rehabilitation outcomes**
