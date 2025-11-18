1. Prevent the “exercise number + name” section from shifting

Right now that block expands only when an exercise is active, so the height changes between "no active exercise" vs. "active exercise." The surrounding layout then jumps.

Fix: give that block a fixed min-height equal to its maximum height.
Easiest solution:

.exercise-header {
  min-height: 3.5rem; /* adjust to match the height when expanded */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

If the text wraps on small screens, you can bump min-height to ~4.5rem.

This locks the space so the dashboard above/below never shifts.

Optional improvement: fade in content instead of growing vertically:

<div class="exercise-header" transition:fade>
  {#if currentExercise}
    <div class="exercise-title">
      Exercise {exerciseIndex + 1}: {currentExercise.name}
    </div>
  {/if}
</div>


---

2. Make the main action buttons (Pause/Resume, Start Now, Skip) taller and spaced out

Right now they sit near the Save controls and feel cramped. On mobile the touch target should be 48px minimum (ideally 56–64px).

Modify the button group:

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1.25rem;
}

.action-buttons button {
  flex: 1;
  padding: 1rem 0; /* taller */
  font-size: 1.1rem;
  border-radius: 12px;
}

And move them visually away from the Save/Finish row:

.save-row {
  margin-top: 2rem; /* separate zones clearly */
}

If you want even clearer segmentation, give the bottom save-area a background:

.save-row {
  background: rgba(0,0,0,0.04);
  padding: 1rem;
  border-radius: 14px;
}


---

3. Let the dashboard take ~50% of the screen on mobile

Right now it occupies about one-third, making controls feel compressed.

Wrap the top area (timer + exercise info + progress indicators) in a container:

<div class="dashboard">
  <!-- timer / exercise name / rep badges / etc -->
</div>

CSS:

.dashboard {
  min-height: 45vh; /* stable and gives breathing room */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 1rem;
}

This also solves the shifting-content problem because the dashboard itself becomes a fixed “block,” and only internal elements change.


---

4. Button layout improvement (mobile-first)

A strong mobile pattern for exercise apps is:

Big timer at top

Exercise name fixed under it

Large row of 2–3 primary action buttons

Secondary buttons (Save/Finish/Stop) grouped at the very bottom


Given your structure, you could switch to a vertical stack instead of a dense horizontal row:

<div class="primary-controls">
  <button on:click={togglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
  <button on:click={startNow}>Start Now</button>
  <button on:click={skipExercise}>Skip</button>
</div>

.primary-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.primary-controls button {
  padding: 1rem;
  font-size: 1.1rem;
  border-radius: 14px;
}

This is friendlier on a phone held with one hand.


---

5. Improve overall hierarchy & reduce visual jumpiness

A few small adjustments dramatically increase visual stability:

a) Make the timer font-size responsive but capped

Your timer jumps slightly on some phones. Replace px or rem with clamp():

.timer-display {
  font-size: clamp(3rem, 10vw, 5rem);
}

b) Lock the rep/set info container height

Similar to the exercise name area:

.rep-info {
  min-height: 2.5rem;
}

c) Add subtle horizontal separators

This makes the UI easier to parse:

.section-divider {
  border-bottom: 1px solid rgba(255,255,255,0.15);
  margin: 1rem 0;
}

