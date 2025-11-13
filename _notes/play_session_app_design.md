**Functional Design Document: Play Session PWA**

---

**1. Overview**

The Play Session PWA is a browser-based fitness app designed to guide users through timed exercise sessions. Users define exercises and sessions, then follow a structured, timer-driven interface to complete workouts. The app is designed as a local-first Progressive Web App (PWA) with a focus on simplicity, clarity, and offline functionality. Cross-device syncing may be introduced in later versions via Pocketbase.

---

**2. Core Functional Areas**

### 2.1 Exercise Manager

**Purpose:** Create and manage reusable definitions for individual exercises.

**UI Components:**

- Exercise List View
- Exercise Editor Modal/Form

**Data Fields:**

- `name` (string, required)
- `default_duration_sec` (integer, optional)
- `default_reps` (integer, optional)
- `default_sets` (integer, optional)
- `type` (enum: `exercise`, `rest`, `stretch`, etc.)
- `icon` or `emoji` (string, optional)

**Behavior:**

- Exercises are uniquely identified.
- Cannot delete an exercise that is in use by a session.
- Modifications do not retroactively affect sessions using them.

---

### 2.2 Session Builder

**Purpose:** Assemble exercises into ordered workout sessions, with optional per-instance overrides.

**UI Components:**

- Session List View
- Session Editor
  - Add Exercise (dropdown or search)
  - Edit Instance (override duration/reps/sets)
  - Reorder/Delete Instance

**Session Data Model:**

```json
{
  "id": "session_id",
  "name": "Morning Workout",
  "exercises": [
    { "exercise_id": "e1", "duration_sec": 60 },
    { "exercise_id": "e2" },
    { "exercise_id": "e3", "sets": 3, "reps": 10 }
  ]
}
```

**Behavior:**

- Total session duration is derived from the sum of durations.
- Editing a session does not affect previously run sessions.

---

### 2.3 Play Session Engine

**Purpose:** Provide guided, timed playback of session items.

**UI Components:**

- Current Exercise Name (prominently displayed)
- Countdown Timer
- Optional Icon/Emoji
- "Up Next" Preview
- Control Panel: Play/Pause, Restart, Skip, Save & Quit, End Session

**Feedback Features:**

- Visual: color change or border animation for active/rest states
- Audio: start/stop tones, 5-sec warning
- Optional: text-to-speech announcements, haptics

**Behavior:**

- Countdown for each exercise instance
- Auto-transition on timer completion
- Pause/resume preserves time and index
- Save & Quit stores current state in `inProgressSession`

---

### 2.4 Timer Subsystem

**Purpose:** Accurate and visually synchronized countdowns for session flow.

**Implementation Notes:**

- Uses `requestAnimationFrame` or `performance.now()` with fallback
- Emits: tick, 5-sec warning, complete signals
- Syncs UI updates to second boundaries

---

### 2.5 Session Persistence & Resume

**Purpose:** Allow sessions to be paused and resumed, or auto-completed if expired.

**Stored Format:**

```json
{
  "session_id": "abc123",
  "current_index": 4,
  "remaining_time_sec": 23,
  "started_at": "2025-07-09T13:12:00Z",
  "last_updated": "2025-07-09T13:18:32Z"
}
```

**Behavior:**

- Offer to resume only if started\_at matches current date
- Auto-complete and archive if day changes

---

### 2.6 Session History

**Purpose:** Record completed and abandoned sessions for later review.

**UI Components:**

- History Log List
- Session Detail View (optional per-exercise breakdown)

**Stored Fields:**

- Session ID
- Completion status (completed, abandoned)
- Date, total duration, exercises completed

---

### 2.7 App State & Storage

**Purpose:** Manage all app data locally.

**Storage:**

- LocalStorage or IndexedDB (via a simple wrapper API)
- Entities: `exercises[]`, `sessions[]`, `inProgressSession`, `sessionHistory[]`

**Startup Behavior:**

- Load definitions
- Check for active session to resume
- Fallbacks for unsupported storage

---

### 2.8 Shell & Navigation

**Purpose:** App-wide routing and access to all core areas.

**Navigation Components:**

- Tab bar or sidebar with:
  - Home / Dashboard
  - Play Session
  - Sessions
  - Exercises
  - History

**Design Goals:**

- Responsive (mobile-first)
- Touch-friendly controls
- Theming for active/rest (and optional dark mode)

---

**3. Non-Goals (MVP)**

- No video tutorials or media demos
- No branching or looping logic in sessions
- No real-time health integration
- No authentication or sync (initial version)

---

**4. Future Enhancements**

- Pocketbase integration for sync/auth
- Progress analytics and streak tracking
- Export/import of session data
- Sharing links for sessions/exercises
- Multi-language support

