<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

<Modal fullScreen={true} title="User Guide" iosStyle={true} on:close={handleClose}>
  <div class="guide-content">
    <!-- Getting Started -->
    <details class="guide-section" open>
      <summary>
        <span class="material-icons">rocket_launch</span>
        Getting Started
      </summary>
      <div class="section-content">
        <h4>Welcome to My PT!</h4>
        <p>
          My PT helps you track your physical therapy exercises and maintain
          consistent rehabilitation routines. Your data stays private on your device,
          and you can use the app offline.
        </p>
        <p>
          This app is intended as an additional aid beyond those provided by medical
          professionals. The audience is primarily people with recurring or chronic physical
          issues that require long-term physical therapy regimen, continued at home beyond
          when they are under the direct care of a therapist.
        </p>

        <h4>First Steps</h4>
        <ol class="steps-list">
          <li>
            <strong>Add Exercises:</strong> Go to Settings and tap "Manage Exercises"
            to create your exercise library with timing and instructions.
          </li>
          <li>
            <strong>Create Sessions:</strong> In Settings, tap "Manage Sessions" to
            group exercises into workout routines.
          </li>
          <li>
            <strong>Start Tracking:</strong> From the Today page, tap "Start Session"
            to begin your physical therapy routine.
          </li>
        </ol>
      </div>
    </details>

    <!-- Today Page -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">today</span>
        Today Page
      </summary>
      <div class="section-content">
        <h4>Starting a Session</h4>
        <p>
          Tap the <strong>Start Session</strong> button to choose a session and begin
          your exercises. Select from your saved sessions to start.
        </p>

        <h4>Exercise Cards</h4>
        <p>
          Each exercise card shows the exercise name and key details. Tap the
          <span class="material-icons inline-icon">info</span> info icon to view
          complete exercise instructions.
        </p>

        <h4>Today's Summary</h4>
        <p>
          The Today page shows all sessions completed today with timestamps and
          exercise counts. Tap any completed session card to view details.
        </p>

        <h4>Resuming Sessions</h4>
        <p>
          If you exit a session before completing it, you can resume from where you
          left off. The Today page will show an "in-progress" session that you can
          tap to continue.
        </p>
      </div>
    </details>

    <!-- Play Page -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">play_circle</span>
        Play Page - Session Player
      </summary>
      <div class="section-content">
        <h4>Session Controls</h4>
        <ul>
          <li>
            <strong>Pause/Resume:</strong>
            <span class="material-icons inline-icon">pause</span> /
            <span class="material-icons inline-icon">play_arrow</span>
            Control session playback
          </li>
          <li>
            <strong>Skip:</strong>
            <span class="material-icons inline-icon">skip_next</span>
            Advance to next exercise
          </li>
          <li>
            <strong>Previous:</strong>
            <span class="material-icons inline-icon">skip_previous</span>
            Go back to previous exercise (while paused)
          </li>
          <li>
            <strong>Auto-Advance:</strong>
            <span class="material-icons inline-icon">autorenew</span>
            Toggle automatic progression between exercises (persists for this session)
          </li>
          <li>
            <strong>Mute:</strong>
            <span class="material-icons inline-icon">volume_off</span>
            Toggle audio cues on/off (persists across all sessions)
          </li>
          <li>
            <strong>Exit:</strong>
            <span class="material-icons inline-icon">exit_to_app</span>
            Save progress and resume later
          </li>
          <li>
            <strong>Finish:</strong>
            <span class="material-icons inline-icon">check_circle</span>
            Complete and save session
          </li>
        </ul>

        <h4>During Exercises</h4>
        <ul>
          <li><strong>3-Second Countdown:</strong> Get ready with a 3-2-1 countdown before each exercise</li>
          <li><strong>Duration exercises:</strong> Countdown timer with audio cues at start/end</li>
          <li><strong>Rep/Set exercises:</strong> Current set and rep count with tones at each rep transition</li>
          <li><strong>Auto-Rest:</strong> Automatic rest timers between sets (configurable in Timing Settings)</li>
          <li><strong>Screen Wake:</strong> Screen stays on during active sessions</li>
        </ul>

        <h4>Selecting Different Exercises</h4>
        <p>
          While paused, tap the
          <span class="material-icons inline-icon">play_circle</span> icon on any
          exercise card in the list to jump directly to that exercise. This is useful
          for skipping ahead or going back to repeat an exercise.
        </p>
      </div>
    </details>

    <!-- Journal Page -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">book</span>
        Journal Page - History & Progress
      </summary>
      <div class="section-content">
        <h4>Viewing Your History</h4>
        <p>
          The Journal page displays all your completed sessions in chronological order.
          Each entry shows the session name, date, time, and exercises completed.
        </p>

        <h4>Navigating Dates</h4>
        <p>
          Use the date picker at the top to jump to a specific date, or scroll through
          your history to see past sessions.
        </p>

        <h4>Session Details</h4>
        <p>
          Tap any journal entry to view complete details including:
        </p>
        <ul>
          <li>All exercises completed in the session</li>
          <li>Duration and rep counts for each exercise</li>
          <li>Total session time</li>
          <li>Session completion timestamp</li>
        </ul>
      </div>
    </details>

    <!-- Managing Exercises -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">fitness_center</span>
        Managing Exercises
      </summary>
      <div class="section-content">
        <h4>Creating Exercises</h4>
        <p>
          In <strong>Settings > Exercise Library</strong>, tap the
          <span class="material-icons inline-icon">add</span> add button to create
          a new exercise:
        </p>
        <ul>
          <li>
            <strong>Exercise Name:</strong> Give it a clear, descriptive name
            (e.g., "Wall Slides", "Shoulder Rotation")
          </li>
          <li>
            <strong>Exercise Type:</strong> Choose between:
            <ul class="nested-list">
              <li><strong>Duration</strong> - Timed exercises (hold for X seconds)</li>
              <li><strong>Reps & Sets</strong> - Count-based exercises (10 reps × 3 sets)</li>
            </ul>
          </li>
          <li>
            <strong>Side Mode:</strong> Select how the exercise is performed:
            <ul class="nested-list">
              <li><strong>Bilateral</strong> - Both sides together (default)</li>
              <li><strong>Unilateral (Left first)</strong> - Left side, then right</li>
              <li><strong>Unilateral (Right first)</strong> - Right side, then left</li>
              <li><strong>Alternating</strong> - Alternate between left and right each rep</li>
            </ul>
          </li>
          <li>
            <strong>Default Settings:</strong> Set the default duration, reps, sets,
            or rep duration based on your therapist's recommendations
          </li>
          <li>
            <strong>Instructions:</strong> Add optional notes about proper form,
            breathing, or modifications. Supports simple formatting:
            <ul class="nested-list">
              <li><strong>Headings:</strong> # Title, ## Heading, ### Subheading</li>
              <li><strong>Emphasis:</strong> **bold**, *italic* or _italic_, __underline__</li>
              <li><strong>Lists:</strong> Start lines with * or - for bullets, 1. 2. 3. for numbered lists</li>
            </ul>
          </li>
        </ul>

        <h4>Editing & Deleting</h4>
        <p>
          In the Exercise Library modal, tap any exercise card to edit it. Tap the
          <span class="material-icons inline-icon">delete</span> delete button to
          remove an exercise. If it's used in sessions, you'll be prompted about
          removing it from those sessions.
        </p>

        <h4>Searching & Sorting</h4>
        <p>
          Use the search bar to find exercises by name, and the sort buttons to organize
          by Name, Created date, or Usage frequency.
        </p>
      </div>
    </details>

    <!-- Managing Sessions -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">playlist_play</span>
        Managing Sessions
      </summary>
      <div class="section-content">
        <h4>Creating Sessions</h4>
        <p>
          In <strong>Settings > Sessions</strong>, tap the
          <span class="material-icons inline-icon">add</span> add button:
        </p>
        <ol class="steps-list">
          <li>
            <strong>Name Your Session:</strong> Choose a descriptive name like
            "Morning Routine" or "Shoulder Therapy"
          </li>
          <li>
            <strong>Select Exercises:</strong> Pick exercises from your library.
            Check the boxes to add them to the session.
          </li>
          <li>
            <strong>Order Exercises:</strong> Use the
            <span class="material-icons inline-icon">arrow_upward</span> and
            <span class="material-icons inline-icon">arrow_downward</span> arrows
            to arrange exercises in the order you want to perform them.
          </li>
          <li>
            <strong>Save:</strong> Tap "Create Session" to save your workout routine.
          </li>
        </ol>

        <h4>Editing Sessions</h4>
        <p>
          Tap any session card to edit it. You can add/remove exercises, reorder them,
          or rename the session.
        </p>
      </div>
    </details>

    <!-- Settings & Preferences -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">settings</span>
        Settings & Preferences
      </summary>
      <div class="section-content">
        <h4>Timing Settings</h4>
        <p>Configure exercise timing in Settings > Player > Timing Settings:</p>
        <ul>
          <li><strong>Default Rep Duration:</strong> Seconds per rep for rep-based exercises</li>
          <li><strong>Start Countdown:</strong> Time to prepare before each exercise</li>
          <li><strong>Rest Between Sets:</strong> Rest time between sets</li>
          <li><strong>Rest Between Exercises:</strong> Rest time when transitioning to new exercise</li>
          <li><strong>End Session Delay:</strong> Auto-return delay after session completion</li>
          <li><strong>Auto-Rest:</strong> Automatic vs manual rest timer control</li>
        </ul>

        <h4>Cue Settings</h4>
        <p>Customize audio and haptic feedback in Settings > Player > Cues:</p>
        <ul>
          <li><strong>Sound & Volume:</strong> Master audio toggle and volume control</li>
          <li><strong>Countdown Tones:</strong> Enable 3-2-1 audio before exercises</li>
          <li><strong>Haptic Feedback:</strong> Vibration for audio cues (device-dependent)</li>
          <li><strong>Preview Sounds:</strong> Test all audio cues (duration, rep, rest, countdown, completion)</li>
        </ul>

        <h4>Data Management</h4>
        <p>In Settings > Data:</p>
        <ul>
          <li>
            <strong>Create Backup:</strong> Download a JSON file containing all your
            exercises, sessions, journal entries, and settings. Keep this file safe!
          </li>
          <li>
            <strong>Restore Backup:</strong> Upload a backup file to restore your data.
            This will replace all current data, so make a backup first if needed.
          </li>
          <li>
            <strong>Export Exercises:</strong> Save your library as a CSV file to edit 
            in Excel/Google Sheets, or as JSON to share with other devices.
          </li>
          <li>
            <strong>Import Exercises:</strong> Load exercises from a file (without affecting
            settings or journal entries). The app will detect duplicates and allow you to skip
            them or import them as copies.
          </li>
        </ul>

        <h4>Display</h4>
        <p>In Settings > Display, you can adjust:</p>
        <ul>
          <li>
            <strong>Theme:</strong> Choose Light, Dark, or Auto (follows system preference)
          </li>
          <li>
            <strong>Color Scheme:</strong> Select from Blue, Purple, Green, Orange, Red, or Teal
          </li>
        </ul>

        <h4>App Updates</h4>
        <p>
          The app updates automatically in the background. When a new version is
          available, it downloads and installs silently. You'll see a brief
          notification when the update is complete. No action needed - your data
          is always preserved during updates.
        </p>
      </div>
    </details>

  </div>
</Modal>

<style>
  .guide-content {
    padding: var(--spacing-lg);
    padding-bottom: var(--spacing-2xl);
  }

  /* Disclaimer */
  .disclaimer {
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    background-color: var(--surface-variant);
    border-left: 3px solid var(--primary-color);
    border-radius: var(--border-radius);
  }

  .disclaimer p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    margin: 0;
  }

  /* Guide Sections (Collapsible) */
  .guide-section {
    margin-bottom: var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .guide-section summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    cursor: pointer;
    user-select: none;
    font-size: var(--font-size-lg);
    font-weight: 500;
    color: var(--text-primary);
    background-color: var(--surface-variant);
    transition: background-color 0.2s;
  }

  .guide-section summary:hover {
    background-color: var(--divider);
  }

  .guide-section summary .material-icons {
    font-size: var(--icon-size-lg);
    color: var(--primary-color);
  }

  .guide-section[open] summary {
    border-bottom: 1px solid var(--divider);
  }

  .section-content {
    padding: var(--spacing-lg);
  }

  .section-content h4 {
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 600;
    margin: var(--spacing-lg) 0 var(--spacing-sm) 0;
  }

  .section-content h4:first-child {
    margin-top: 0;
  }

  .section-content p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: var(--spacing-sm) 0;
  }

  .section-content ul,
  .section-content ol {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: var(--spacing-md) 0;
    padding-left: var(--spacing-xl);
  }

  .section-content li {
    margin: var(--spacing-sm) 0;
  }

  .section-content strong {
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Special lists */
  .steps-list {
    counter-reset: step-counter;
    list-style: none;
    padding-left: 0;
  }

  .steps-list li {
    counter-increment: step-counter;
    position: relative;
    padding-left: 2.5rem;
    margin: var(--spacing-md) 0;
  }

  .steps-list li::before {
    content: counter(step-counter);
    position: absolute;
    left: 0;
    top: 0;
    width: 1.75rem;
    height: 1.75rem;
    background-color: var(--primary-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .nested-list {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }

  /* Inline icons */
  .inline-icon {
    font-size: 1rem;
    vertical-align: middle;
    color: var(--primary-color);
  }

  @media (max-width: 480px) {
    .guide-content {
      padding: var(--spacing-md);
    }

    .guide-section summary {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
    }

    .section-content {
      padding: var(--spacing-md);
    }
  }
</style>
