# My PT - Physical Therapy Home Exercise Tracker

## Complete Functional Specification

**Status:** ✅ CANONICAL REFERENCE
**Last Updated:** November 2024
**Notes:** This is the comprehensive functional specification document that defines the complete application behavior, data models, and UX flows. Use this as the authoritative reference for development. README.md provides user-facing documentation and high-level architecture overview.

### Overview

The purpose of this application is to create a custom program of physical therapy exercises to do at home (based on direction from a physical therapist), then track the exercises daily. The application features a "session" system where users can time the performance of each exercise and automatically journal their completion.

### Technical Features 
* Progressive Web App, installable on iOS or Android or run in browser
* Local-first, with IndexedDB storage and full offline functionality
* Privacy-centric (no data leaves the device)
* Simple, clean UI with responsive design for accessibility
* Based on SvelteKit architecture following My Calcium app patterns

### Core Data Models

#### Exercise Definition
```typescript
interface Exercise {
  id: number;
  name: string;
  type: 'duration' | 'reps';
  defaultDuration?: number; // seconds for duration-based
  defaultReps?: number;
  defaultSets?: number;
  defaultRepDuration?: number; // seconds per rep for timing
  instructions?: string;
  includeInDefault: boolean;
  dateAdded: string;
}
```

#### Session Definition
```typescript
interface SessionDefinition {
  id: number;
  name: string; // "Default", "Morning Routine", etc.
  exercises: SessionExercise[];
  isDefault: boolean;
}

interface SessionExercise {
  exerciseId: number;
  duration?: number; // override for this session
  reps?: number;
  sets?: number;
  repDuration?: number;
}
```

#### Session Instance (Journal Entry)
```typescript
interface SessionInstance {
  date: string; // YYYY-MM-DD
  sessionDefinitionId: number;
  sessionName: string;
  status: 'planned' | 'in-progress' | 'completed' | 'logged';
  startTime?: string;
  endTime?: string;
  completedExercises: CompletedExercise[];
  customized: boolean; // true if exercises were modified for this instance
}

interface CompletedExercise {
  exerciseId: number;
  completed: boolean;
  actualDuration?: number;
  skipped?: boolean;
}
```

### User Interface Structure

#### Design System Inheritance
- **Color Scheme**: Inherits My Calcium's CSS custom properties (--primary-color, --surface, --text-primary, etc.)
- **Typography**: Uses same font system (--font-size-*, --font-weight-*)
- **Iconography**: Material Icons consistent with My Calcium's icon selection rationale
- **Spacing**: Same spacing scale (--spacing-xs through --spacing-xl)
- **Component Styling**: Modal overlays, buttons, form inputs follow My Calcium patterns

#### Main Navigation (Bottom Tab Bar)
- **Persistent bottom navigation** with three primary tabs
- **Auto-hide during session player** for full-screen exercise experience
- **Material Icons** for tab indicators: `today`, `book`, `settings`
- **Tab Structure**:
  1. **Today** (`today`) - Current day session view (default)
  2. **Journal** (`book`) - Session history and calendar  
  3. **Settings** (`settings`) - Exercise management and app configuration

#### Screen Flow
1. **Today Screen** (Landing page)
   - Minimal header with current date (no hamburger menu)
   - Displays selected session definition for today
   - Session summary (exercise count, estimated duration)
   - Action buttons: Play Session, Log Session, Select Different Session, Edit Session
   
2. **Session Player** (Full screen)
   - **No header or bottom tabs visible** - complete focus on exercise
   - Media player inspired interface
   - Progress display with current exercise details
   - Exercise list with progress indicators
   - Play/pause controls, skip buttons, save/exit options

3. **Journal Screen**
   - Simple header with page title
   - Scrollable history of completed sessions
   - Calendar picker for specific dates
   - Session details view

4. **Settings Screen**
   - Simple header with page title
   - Exercise management (add/edit/delete)
   - Session definition management  
   - App preferences (timing defaults, theme)

### Exercise Management

#### Exercise Types

**Duration-Based Exercise:**
- User sets total duration in seconds/minutes
- Timer counts down from total duration
- Single continuous exercise

**Reps/Sets-Based Exercise:**
- User defines number of sets and reps per set
- App calculates total duration using rep duration setting
- Each set is timed separately with rest between sets

#### Exercise CRUD Operations
- **Add Exercise:** Form with name, type, default values, instructions
- **Edit Exercise:** Modify any exercise properties
- **Delete Exercise:** Remove from library (warns if used in session definitions)
- **Instructions:** Optional text field for exercise guidance

#### Default Values
- **Global rep duration:** Default seconds per rep (configurable in settings)
- **Per-exercise rep duration:** Can override global default
- **Default rest between sets:** Configurable pause between sets
- **Default rest between exercises:** Configurable pause between exercises

### Session System

#### Session Definitions
- **Default Session:** Automatically includes all exercises marked "includeInDefault"
- **Custom Sessions:** User-created playlists of specific exercises
- **Session Templates:** Named collections like "Morning Routine", "Post-Workout", etc.

#### Session Selection Flow
1. User opens app to Today screen showing current session
2. Can select different session definition from list
3. Can edit current session (creates custom instance for today only)
4. Selected session becomes "active" for the day

#### Ad-hoc Session Creation
- Start from any session definition
- Add/remove exercises for this session only
- Modify reps, sets, or duration for specific exercises
- Changes only affect current day's session

### Play Session Interface

#### Layout Structure
**Top Third - Current Exercise Display:**
- Count-up timer (total session time elapsed)
- Pause button (top right)
- Skip button (bottom right)
- Save & Exit button
- Save Progress & Exit button
- Current exercise block (matches list item design)

**Bottom Two-Thirds - Exercise List:**
- Scrollable list of all session exercises
- Each exercise shown as a cell/row
- Active exercise highlighted/indicated
- Completed exercises show checkmark and muted coloring
- Auto-scroll to keep current exercise visible

#### Exercise Cell Design
- **Header:** Exercise number, name, set info
- **Duration Display:** Total time for duration-based OR calculated time for reps/sets
- **Progress Bar:** Fills left-to-right as exercise progresses
- **Color Scheme:** Dark blue background with white text, white progress bar below

#### Exercise Timing Flow

**Start Sequence (All Exercises):**
1. 10-second countdown to start (configurable)
2. Large countdown display
3. Transition to main exercise timer

**Duration-Based Exercises:**
1. Count-down timer showing remaining time
2. Final 10-second countdown emphasized (configurable)
3. Automatic progression to next exercise

**Reps/Sets Exercises:**
1. Display current set and rep count
2. Count up reps at configured pace
3. Rest period between sets (configurable duration)
4. Final set shows countdown for last 10 seconds
5. Automatic progression to next exercise

#### Exercise Progression
- Automatic advancement to next exercise
- Rest period between exercises (configurable)
- Completed exercises remain visible but muted
- Session ends automatically after last exercise

#### Control Functions
- **Pause:** Pause current exercise, show resume/rewind options
- **Skip:** Complete current exercise, advance to next
- **Save & Exit:** End session, mark as completed
- **Save Progress & Exit:** Save progress, allow resume later
- **15-second Rewind:** Available during pause (for rep timing adjustment)

### Journal & History

#### Daily Journal View
- List of completed sessions by date (newest first)
- Each entry shows: date, session name, completion status, duration
- Expandable details: exercise list, actual vs planned times
- Filter/search capabilities

#### Calendar Integration
- Calendar picker to jump to specific dates
- Visual indicators for completed session days
- Review past session details
- No editing of historical data

#### Session Status Types
- **Planned:** Session defined but not started
- **In Progress:** Session started but not completed (can resume)
- **Completed:** Session finished through player
- **Logged:** Session marked complete without timing (manual log)

### Settings & Configuration

#### Exercise Settings
- Default rep duration (seconds per rep)
- Start countdown duration (seconds before exercise begins)
- End countdown duration (seconds to emphasize before exercise ends)
- Rest between sets (seconds)
- Rest between exercises (seconds)

#### App Settings
- Theme (light/dark/auto)
- Exercise sorting (alphabetical, date added, usage frequency)
- Session auto-save frequency
- Notification preferences (if PWA notifications implemented)

#### Exercise Library Management
- Add new exercises
- Edit existing exercises
- Delete exercises (with dependency warnings)
- Mark exercises for default session inclusion

#### Session Definition Management
- Create new session definitions
- Edit existing session playlists
- Delete session definitions
- Set default session

#### Technical Implementation Notes

#### Architecture
- SvelteKit-based PWA following My Calcium patterns
- IndexedDB for local data storage
- Component-based UI architecture
- Service layer for data management (PTService similar to CalciumService)
- Svelte stores for state management

#### Design System Integration
- **CSS Variables**: Inherit all My Calcium design tokens (colors, spacing, typography)
- **Component Library**: Reuse Modal, Toast, DatePicker, and form components
- **Icon System**: Material Icons with consistent selection rationale:
  - Navigation: `today`, `book`, `settings`
  - Player Controls: `play_arrow`, `pause`, `skip_next`, `save`, `stop`
  - Exercise Types: `timer`, `fitness_center` 
  - Actions: `add`, `edit`, `delete`, `check_circle`
- **Responsive Breakpoints**: Same mobile-first approach as My Calcium
- **Theme Support**: Inherit light/dark/auto theme system

#### Data Storage
- **Exercises:** Stored in IndexedDB exercises table
- **Session Definitions:** Stored in sessionDefinitions table
- **Journal Entries:** Stored in sessionInstances table with date-based keys
- **Settings:** Stored in localStorage for quick access

#### UI Components Architecture
- **BottomTabs.svelte**: New component following My Calcium's Header.svelte patterns
- **SessionPlayer.svelte**: Full-screen component with auto-hide navigation
- **ExerciseCard.svelte**: Follows FoodEntry.svelte design patterns
- **SessionList.svelte**: Similar to My Calcium's food list structure
- **PTSettings.svelte**: Follows My Calcium's settings page structure

#### Performance Considerations
- Responsive design optimized for mobile (iPhone with enlarged display)
- Minimal animations to avoid distraction during exercises
- Offline-first approach with no network dependencies
- Timer precision for accurate exercise timing
- Bottom tab state management for show/hide during sessions

#### Progressive Web App Features
- Installable on iOS/Android
- Offline functionality
- Mobile-optimized interface
- Full-screen exercise player mode
- Same PWA manifest approach as My Calcium

### User Experience Flow

#### Typical Daily Usage
1. User opens app (shows Today screen)
2. Reviews today's session (default or previously selected)
3. Optionally selects different session or edits current one
4. Taps "Play Session" to enter full-screen player
5. Follows exercise timing and progression
6. Completes session or saves progress
7. Session automatically logged to journal

#### Session Management
1. User creates custom session definitions in Settings
2. Adds/removes exercises from custom sessions
3. Sets session-specific overrides for reps/duration
4. Names and saves session for reuse
5. Selects from saved sessions on Today screen

#### Exercise Library Management
1. User adds new exercises as prescribed by physical therapist
2. Sets appropriate defaults for each exercise type
3. Includes relevant exercises in default session
4. Maintains library over time as therapy evolves

This specification provides a complete blueprint for building a focused, user-friendly physical therapy exercise tracking application based on the proven SvelteKit PWA architecture.