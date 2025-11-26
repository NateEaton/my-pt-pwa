Session Player Display Redesign Spec
1. Purpose

Create a visually consistent and stable display area for exercise status, counters, and transitions within the session player. Eliminate layout jumps, standardize row heights, and emphasize numeric counters without reflowing the interface.

The goal is to:

Prevent UI resizing as content changes.

Ensure numbers (time, reps, countdown) receive visual emphasis.

Make transitions smooth, not jarring.

Remove duplicate or unnecessary copy (“Get Ready” twice).

Allow future layout/components to reuse these design rules.

2. Target UI Area
main-display-area

A fixed-height vertically centered display containing two rows of content, regardless of page state.

Responsibilities

Maintain consistent total height.

Vertically center content.

House exactly two display-row elements for all states.

Provide smooth visual transitions without layout changes.

Requirements
Property	Spec
Rows	Always 2 rows
Responsiveness	Scales fonts, does NOT resize container
Behavior	Smooth fade/scale transitions
Centering	Vertical + horizontal
3. Standard Row Component
.display-row

Reusable flex row with locked height.

Property	Spec
Height	3.5rem (configurable)
Layout	Horizontal center, baseline aligned
Width	100%
Transitions	opacity, transform only
Row Types	small, big
Base CSS
.display-row {
  width: 100%;
  height: 3.5rem;
  display: flex;
  justify-content: center;
  align-items: baseline;
  font-weight: 500;
  transition: opacity 200ms ease, transform 200ms ease;
}

4. Typography Rules
Numeric Emphasis

Use .display-row.big

Font: 3rem, bold numeric emphasis

Optionally monospace numbers for stability

.display-row.big {
  font-size: 3rem;
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
}

Context Text (Small)
.display-row.small {
  font-size: 1.25rem;
  opacity: 0.85;
}

5. Layout States

Each state must use exactly 2 rows in this format:

🏋️ Active Exercise (Reps / Duration)
Row 1: Exercise Title (small)
Row 2: Counter (big)

🔁 Rest Between Sets
Row 1: Rest (small)
Row 2: Remaining Time (big)

🎬 Countdown (Starting)
Row 1: Get Ready (small)
Row 2: 3 / 2 / 1 (big)

⏭️ Preparing Next Exercise
Row 1: Next: <Exercise Name> (small)
Row 2: Reps / Duration (big)


❗ No “Get Ready” duplication during preparation. The countdown alone indicates readiness.

✔️ Session Complete
Row 1: ✓ Done! (big)
Row 2: Session complete (small)

6. Component Structure
DisplayRow.svelte (Optional Extracted Component)
<script>
  export let size = "small"; // or "big"
  export let text = "";
</script>

<div class={`display-row ${size}`}>{text}</div>

Usage in Session Player
<DisplayRow size="small" text={title} />
<DisplayRow size="big" text={value} />

7. Container Specifications
.main-display-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center; /* vertical centering */
  align-items: center;
  min-height: 200px;
  max-height: 30vh; /* prevents expansion */
}

8. Enhancement Options (Optional, Future)
Enhancement	Purpose
Scale pop animation on counter change	Reward UX clarity
Soft shadow around big numbers	Enhance emphasis
Border separator between rows	Improve readability
Color theme variation per state	State clarity (light colors only)
9. Excluded Behaviors

No layout shifting to emphasize countdown.

No viewport-based font scaling (vw, vh) inside rows.

No extra lines of text added dynamically.

No padding changes between states.

10. Test Criteria
Success Metric	Pass Condition
No height change	Switch rapidly through all states
Numeric emphasis clear	Big rows noticeably dominant
No duplicate language	"Get Ready" not shown twice
Smooth transitions	No jerky content jump
Responsive	Mobile & desktop keep same structure