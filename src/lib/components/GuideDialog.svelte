<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * GuideDialog Component - User guide and help
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

<Modal fullScreen={true} title="User Guide" on:close={handleClose}>
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
          This app helps you track your physical therapy exercises and maintain
          consistent rehabilitation routines. Your data stays private on your device,
          and you can use the app offline.
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
        Today Page - Daily Tracking
      </summary>
      <div class="section-content">
        <h4>Starting a Session</h4>
        <p>
          Tap the <strong>Start Session</strong> button to choose a session and begin
          your exercises. You can select from your saved sessions or use the default
          session.
        </p>

        <h4>During a Session</h4>
        <ul>
          <li>
            <strong>Exercise Timer:</strong> Each exercise displays with a countdown
            timer based on your configured duration or rep settings.
          </li>
          <li>
            <strong>Rest Periods:</strong> The app automatically includes rest time
            between sets and exercises according to your timing settings.
          </li>
          <li>
            <strong>Pause/Resume:</strong> Use the
            <span class="material-icons inline-icon">pause</span> pause button to
            take a break, or <span class="material-icons inline-icon">play_arrow</span>
            resume to continue.
          </li>
          <li>
            <strong>Skip:</strong> Tap
            <span class="material-icons inline-icon">skip_next</span> to move to the
            next exercise or set.
          </li>
          <li>
            <strong>Stop:</strong> Tap
            <span class="material-icons inline-icon">stop</span> to end the session
            early. Completed exercises will still be saved.
          </li>
        </ul>

        <h4>Today's Summary</h4>
        <p>
          The Today page shows all sessions completed today with timestamps and
          exercise counts. Tap any completed session card to view details.
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
            <ul>
              <li><strong>Duration</strong> - Timed exercises (hold for X seconds)</li>
              <li><strong>Reps & Sets</strong> - Count-based exercises (10 reps × 3 sets)</li>
            </ul>
          </li>
          <li>
            <strong>Default Settings:</strong> Set the default duration, reps, sets,
            or rep duration based on your therapist's recommendations
          </li>
          <li>
            <strong>Instructions:</strong> Add optional notes about proper form,
            breathing, or modifications
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

        <h4>Default Session</h4>
        <p>
          You can mark one session as the default. This session will be pre-selected
          when you tap "Start Session" on the Today page.
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
        <h4>Quick Access Settings</h4>
        <p>At the top of the Settings page, you can quickly adjust:</p>
        <ul>
          <li>
            <strong>Audio:</strong> Toggle sound on/off and adjust volume for
            audio cues during exercises
          </li>
          <li>
            <strong>Theme:</strong> Choose Light, Dark, or Auto (follows system preference)
          </li>
        </ul>

        <h4>Timing Settings</h4>
        <p>
          Tap <strong>Timing Settings</strong> to customize:
        </p>
        <ul>
          <li>
            <strong>Default Rep Duration:</strong> Seconds per rep for rep-based exercises
          </li>
          <li>
            <strong>Start Countdown:</strong> Countdown before each exercise begins
            (gives you time to get into position)
          </li>
          <li>
            <strong>End Countdown:</strong> Countdown before exercise ends
            (prepare to rest)
          </li>
          <li>
            <strong>Rest Between Sets:</strong> Rest time between sets of the same exercise
          </li>
          <li>
            <strong>Rest Between Exercises:</strong> Rest time when moving to a new exercise
          </li>
          <li>
            <strong>End Session Delay:</strong> Time before session automatically ends
          </li>
        </ul>

        <h4>Data Management</h4>
        <ul>
          <li>
            <strong>Create Backup:</strong> Download a JSON file containing all your
            exercises, sessions, journal entries, and settings. Keep this file safe!
          </li>
          <li>
            <strong>Restore Backup:</strong> Upload a backup file to restore your data.
            This will replace all current data, so make a backup first if needed.
          </li>
        </ul>
      </div>
    </details>

    <!-- Tips & Best Practices -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">lightbulb</span>
        Tips & Best Practices
      </summary>
      <div class="section-content">
        <h4>Building Your Exercise Library</h4>
        <ul>
          <li>
            Add all exercises prescribed by your physical therapist, even if you
            don't use them daily
          </li>
          <li>
            Include detailed instructions for proper form, especially for complex
            movements
          </li>
          <li>
            Use clear, consistent naming (e.g., "Left Shoulder Rotation" vs
            "Right Shoulder Rotation")
          </li>
        </ul>

        <h4>Creating Effective Sessions</h4>
        <ul>
          <li>
            Create separate sessions for morning and evening if your therapist
            recommends split routines
          </li>
          <li>
            Order exercises from warm-up to cooldown, typically:
            <ol class="nested-list">
              <li>Gentle range-of-motion exercises</li>
              <li>Strengthening exercises</li>
              <li>Stretching and flexibility</li>
            </ol>
          </li>
          <li>
            Start with shorter sessions and gradually increase as you build strength
          </li>
        </ul>

        <h4>Staying Consistent</h4>
        <ul>
          <li>
            Set a regular time each day for your exercises - consistency is key
            to rehabilitation
          </li>
          <li>
            Use the Journal to track your progress and see how far you've come
          </li>
          <li>
            Create a backup of your data regularly, especially after adding new
            exercises or completing important milestones
          </li>
        </ul>

        <h4>Privacy & Data</h4>
        <ul>
          <li>
            All your data is stored locally on your device - nothing is sent to
            any servers
          </li>
          <li>
            The app works completely offline once installed
          </li>
          <li>
            Your backups are plain JSON files you can read, edit, or store wherever
            you prefer
          </li>
        </ul>
      </div>
    </details>

    <!-- Troubleshooting -->
    <details class="guide-section">
      <summary>
        <span class="material-icons">help_outline</span>
        Troubleshooting
      </summary>
      <div class="section-content">
        <h4>Common Issues</h4>

        <p><strong>The app won't load or appears blank:</strong></p>
        <ul>
          <li>Try refreshing the page (pull down on mobile)</li>
          <li>Clear your browser cache and reload</li>
          <li>Make sure JavaScript is enabled in your browser</li>
        </ul>

        <p><strong>Audio cues aren't working:</strong></p>
        <ul>
          <li>Check that Audio is enabled in Settings</li>
          <li>Increase the volume slider in Settings</li>
          <li>Check your device's volume settings</li>
          <li>Some browsers require user interaction before playing audio</li>
        </ul>

        <p><strong>Data disappeared after updating:</strong></p>
        <ul>
          <li>Your data should be preserved, but browser storage can be cleared</li>
          <li>Restore from your most recent backup file</li>
          <li>This is why regular backups are important!</li>
        </ul>

        <p><strong>Session won't start:</strong></p>
        <ul>
          <li>Make sure you have at least one exercise in your library</li>
          <li>Make sure the selected session contains at least one exercise</li>
          <li>Try creating a new session with different exercises</li>
        </ul>

        <h4>Installing as an App</h4>
        <p>
          For the best experience, install My PT as a standalone app:
        </p>
        <ul>
          <li>
            <strong>Mobile (Chrome/Safari):</strong> Tap the share button and
            select "Add to Home Screen"
          </li>
          <li>
            <strong>Desktop (Chrome/Edge):</strong> Click the install icon in the
            address bar, or go to Settings > Install My PT
          </li>
        </ul>
      </div>
    </details>
  </div>
</Modal>

<style>
  .guide-content {
    padding: var(--spacing-lg);
    padding-bottom: var(--spacing-2xl);
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
