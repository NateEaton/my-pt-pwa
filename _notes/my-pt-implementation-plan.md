# My PT - Implementation Plan

## Project Setup & Development Roadmap

### Phase 1: Project Foundation (1-2 days)

#### 1.1 Project Initialization
- [ ] Create new SvelteKit project based on My Calcium structure
- [ ] Copy core infrastructure from My Calcium:
  - [ ] `app.css` (design system variables)
  - [ ] `app.html` (PWA setup)
  - [ ] `svelte.config.js` and `vite.config.js` (build configuration)
  - [ ] PWA manifest and icons (customize for PT app)
- [ ] Update package.json dependencies to match My Calcium
- [ ] Set up development environment and build scripts

#### 1.2 Core Architecture Setup
- [ ] Create basic folder structure:
  ```
  src/lib/
    components/     # Shared UI components
    services/       # PTService (data management)
    stores/         # Svelte stores for state
    types/          # TypeScript interfaces
    utils/          # Helper functions
  src/routes/       # Pages (today, journal, settings)
  ```
- [ ] Copy and adapt key files from My Calcium:
  - [ ] `src/lib/stores/pt.ts` (adapted from calcium.ts)
  - [ ] Basic type definitions in `src/lib/types/pt.ts`

### Phase 2: Data Layer & Core Services (2-3 days)

#### 2.1 Data Models Implementation
- [ ] Create TypeScript interfaces for:
  - [ ] `Exercise` interface
  - [ ] `SessionDefinition` interface  
  - [ ] `SessionInstance` interface
  - [ ] `CompletedExercise` interface
- [ ] Set up Svelte stores for application state
- [ ] Create initial state management patterns

#### 2.2 PTService Development
- [ ] Create `PTService.ts` based on `CalciumService.ts` patterns:
  - [ ] IndexedDB initialization and schema
  - [ ] Exercise CRUD operations
  - [ ] Session definition management
  - [ ] Journal entry handling
  - [ ] Settings persistence
- [ ] Implement data migrations system
- [ ] Add error handling and validation

#### 2.3 Database Schema
- [ ] Design IndexedDB object stores:
  - [ ] `exercises` (exercise definitions)
  - [ ] `sessionDefinitions` (session templates)
  - [ ] `sessionInstances` (daily journal entries)
  - [ ] `settings` (app configuration)
- [ ] Create database migration system
- [ ] Add data export/import functionality

### Phase 3: UI Foundation & Navigation (2-3 days)

#### 3.1 Reusable Components
- [ ] Copy and adapt from My Calcium:
  - [ ] `Modal.svelte` (reuse as-is)
  - [ ] `Toast.svelte` (reuse as-is)
  - [ ] `DatePicker.svelte` (reuse as-is)
  - [ ] `ConfirmDialog.svelte` (reuse as-is)
- [ ] Create PT-specific components:
  - [ ] `BottomTabs.svelte` (new navigation component)
  - [ ] `ExerciseCard.svelte` (based on FoodEntry patterns)

#### 3.2 Bottom Navigation System
- [ ] Implement `BottomTabs.svelte`:
  - [ ] Three-tab layout (Today/Journal/Settings)
  - [ ] Active state management
  - [ ] Hide/show functionality for session player
  - [ ] Material Icons integration
  - [ ] Touch-friendly sizing
- [ ] Create navigation state management
- [ ] Add route-based active tab highlighting

#### 3.3 Layout Structure
- [ ] Create main layout component
- [ ] Implement responsive design system
- [ ] Add theme support (light/dark/auto)
- [ ] Set up CSS custom properties inheritance

### Phase 4: Today Screen & Session Management (3-4 days)

#### 4.1 Today Screen Implementation
- [ ] Create today page (`src/routes/+page.svelte`)
- [ ] Session summary display:
  - [ ] Current date header
  - [ ] Selected session overview
  - [ ] Exercise count and estimated duration
  - [ ] Action buttons layout
- [ ] Session selection modal
- [ ] Session editing functionality

#### 4.2 Session Definition Management
- [ ] Session selection interface:
  - [ ] List of available session definitions
  - [ ] Default session handling
  - [ ] Custom session creation
- [ ] Session editing modal:
  - [ ] Add/remove exercises
  - [ ] Override reps/duration/sets
  - [ ] Save as new session definition
- [ ] Session validation and error handling

#### 4.3 Exercise Management Foundation
- [ ] Exercise list component
- [ ] Add exercise modal (basic version)
- [ ] Edit exercise functionality
- [ ] Exercise type handling (duration vs reps/sets)

### Phase 5: Session Player Interface (4-5 days)

#### 5.1 Player Layout
- [ ] Create `SessionPlayer.svelte` component:
  - [ ] Full-screen layout
  - [ ] Hide navigation during session
  - [ ] Top third: current exercise display
  - [ ] Bottom two-thirds: exercise list
- [ ] Exercise progress visualization
- [ ] Auto-scroll for active exercise

#### 5.2 Exercise Timing Engine
- [ ] Timer management system:
  - [ ] Countdown timers (start/end warnings)
  - [ ] Duration-based exercise timing
  - [ ] Reps/sets timing with rest periods
  - [ ] Progress calculation and display
- [ ] Exercise progression logic
- [ ] Automatic advance between exercises

#### 5.3 Player Controls
- [ ] Play/pause functionality
- [ ] Skip exercise capability
- [ ] Save and exit options
- [ ] 15-second rewind feature
- [ ] Session state persistence

### Phase 6: Journal & History (2-3 days)

#### 6.1 Journal Interface
- [ ] Create journal page (`src/routes/journal/+page.svelte`)
- [ ] Session history list:
  - [ ] Chronological display
  - [ ] Session completion status
  - [ ] Expandable details
- [ ] Calendar integration for date navigation
- [ ] Session details modal

#### 6.2 Data Visualization
- [ ] Session completion tracking
- [ ] Basic statistics display
- [ ] Historical progress indicators
- [ ] Export functionality

### Phase 7: Settings & Configuration (2-3 days)

#### 7.1 Settings Interface
- [ ] Create settings page (`src/routes/settings/+page.svelte`)
- [ ] Exercise library management:
  - [ ] Add/edit/delete exercises
  - [ ] Exercise type configuration
  - [ ] Default value settings
- [ ] Session definition management
- [ ] App preferences panel

#### 7.2 Configuration Options
- [ ] Timing defaults:
  - [ ] Default rep duration
  - [ ] Start/end countdown durations
  - [ ] Rest periods between sets/exercises
- [ ] App settings:
  - [ ] Theme selection
  - [ ] Exercise sorting preferences
  - [ ] Notification settings (if implemented)

### Phase 8: Testing & Polish (2-3 days)

#### 8.1 Comprehensive Testing
- [ ] Exercise creation and management
- [ ] Session definition workflows
- [ ] Session player functionality
- [ ] Timer accuracy and reliability
- [ ] Data persistence across sessions
- [ ] Mobile responsiveness testing
- [ ] PWA installation and offline functionality

#### 8.2 User Experience Polish
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Visual polish and animations
- [ ] Error handling and user feedback
- [ ] Documentation and help text

#### 8.3 Deployment Preparation
- [ ] Build optimization
- [ ] PWA manifest finalization
- [ ] Icon and splash screen creation
- [ ] Production deployment setup

## Development Guidelines

### Code Organization
- **Follow My Calcium patterns** for consistent architecture
- **Reuse components** wherever possible (Modal, Toast, etc.)
- **Maintain TypeScript** for type safety
- **Use same naming conventions** as My Calcium
- **Keep components small** and focused on single responsibilities

### Key Dependencies from My Calcium
- SvelteKit framework and adapter-static
- Vite with PWA plugin
- Material Icons
- Same build and deployment scripts
- IndexedDB patterns and utilities

### Testing Strategy
- **Manual testing** on target device (iPhone with enlarged display)
- **Timer accuracy** verification across different exercise types
- **Data persistence** testing after app restarts
- **Offline functionality** validation
- **PWA installation** testing on iOS

### Deployment Approach
- Use My Calcium's deployment scripts as foundation
- Same static site generation approach
- PWA manifest for installability
- GitHub Pages or similar static hosting

## Estimated Timeline: 18-25 days

This timeline assumes:
- Part-time development (2-4 hours/day)
- Heavy reuse of My Calcium components and patterns
- Iterative testing and refinement
- Single developer working alone

## Next Steps After Implementation Plan

1. **Set up development environment** and copy My Calcium foundation
2. **Start with Phase 1** and work systematically through each phase
3. **Test frequently** on the target device throughout development
4. **Get user feedback** from your wife during Phase 4 (Today screen) to validate UX
5. **Iterate based on real usage** during Phases 5-6

The modular approach allows for early testing and feedback, ensuring the app meets your wife's specific needs before investing time in advanced features.