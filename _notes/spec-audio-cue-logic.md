# Audio Cue Logic Spec: Delayed End-of-Set Gong and Cue Cleanup

**Status:** Implemented (see §18 for deviations and deferred items)  
**Created:** 2026-06-06  
**Implemented:** 2026-06-19  
**Scope:** Session player audio/haptic cue behavior for reps, sets, exercises, rests, side switches, and session completion.

---

## 1. Problem Statement

The current branch attempted to add an end-of-set cue, but the result does not meet the desired user experience:

1. The set-complete cue replaces the normal final rep-end cue on non-final sets.
2. The set-complete cue is not delayed by 0.5-1.0 seconds after the rep-end cue.
3. The set-complete cue does not fire on final sets of exercises.
4. The set-complete cue does not fire on the final set of the final exercise.
5. The set-complete sound is a short two-note chime, not a warmer meditation-style gong.
6. Between-set rest timing is indirectly affected by cue scheduling and extra hard-coded delays.
7. Duration-exercise end cue gating appears to use the wrong setting.
8. Cue logic is duplicated between normal start and resume paths.
9. Demo-player cue behavior is out of sync with the production player.
10. Settings and preview UI do not document the full cue model clearly.

This spec defines the intended cue model before further implementation.

---

## 2. Goals

### 2.1 End-of-set cue behavior

Add a clear, distinctive, pleasant end-of-set cue for reps-based exercises.

The end-of-set cue must:

1. Play at the end of **every completed set** of a reps exercise.
2. Include non-final sets.
3. Include the final set of an exercise.
4. Include the final set of the final exercise in a session.
5. Sound like a pleasant, warm, meditation-session-style gong or chime.
6. Be aurally distinct from:
   - rep-start cue,
   - rep-end cue,
   - side-switch cue,
   - rest-start cue,
   - rest-end cue,
   - exercise-start/end cues,
   - session-complete cue.
7. Play **after** the final rep-end cue, not instead of it.
8. Lag the final rep-end cue by enough time to avoid overlap or perceptual merging.
9. Default to a delay in the range of 0.5-1.0 seconds after the final rep-end cue.
10. Never be the event that starts the between-set rest interval.

### 2.2 Rest timing behavior

Rest timing must be anchored to the actual completion of the set, not to any delayed cue.

For example, with a 10-second between-set rest:

1. `T=0.0s`: final rep completes and the normal rep-end cue plays.
2. `T=0.0s`: the rest interval starts immediately.
3. `T=0.5-1.0s`: delayed set-complete gong plays.
4. `T=10.0s`: the next set becomes eligible to begin.
5. If auto-starting sets, the first cue/action for the next set should begin at `T=10.0s`, except for separately configured setup/countdown phases that are explicitly part of the user-visible timing model.

### 2.3 General cue cleanup

While implementing the end-of-set cue, clean up the broader cue model so that cue triggers are:

1. centralized,
2. easy to reason about,
3. consistently applied in start and resume paths,
4. consistently applied in production and demo players,
5. aligned with user settings,
6. testable without relying on real time or browser audio output.

---

## 3. Non-Goals

This spec does not require:

1. Replacing the Web Audio API implementation with sampled audio files.
2. Adding voice prompts.
3. Adding per-cue volume sliders.
4. Redesigning the session player UI.
5. Changing exercise data models for reps, sets, sides, holds, or rests.
6. Changing completion history semantics.

Sampled audio files may be considered in a future spec if synthetic gong quality is not satisfactory.

---

## 4. External App Observations

A short review of comparable workout/timer apps suggests a useful pattern: set completion typically starts rest timing immediately, rest completion gets the actionable alert, and whole-workout/session completion gets a separate completion cue. In other words, apps generally avoid letting celebratory or informational sounds redefine timer boundaries.

Observed patterns:

1. **Strength logging apps anchor rest to set completion.** Strong documents that its rest timer triggers immediately after a set is completed and separately allows users to configure the timer sound effect. Stronglifts similarly documents that its rest timer automatically starts when a set is logged and notifies the user when it is time for the next set.
2. **Rest-end is the actionable alert in strength workflows.** Stronglifts describes the rest timer as providing a visual and/or audible notification when it is time to do the next set. StrengthMark and RYSE likewise describe chime/alert behavior at rest completion after the rest timer starts on set completion.
3. **Interval-timer apps distinguish phase alerts from timer-complete alerts.** Seconds Interval Timer supports alert volume, vibration, custom spoken messages, and an explicit end message when the timer completes. App-store descriptions for interval timers commonly distinguish work/rest phase sounds, warning beeps, and full-session completion alerts.
4. **Implication for My PT:** the set-complete gong should be a non-blocking confirmation/closure cue inside the rest window. The cue that matters operationally for starting the next set is the rest-end/next-start cue, while exercise-complete and session-complete cues should be prioritized only when they add information that the set-complete cue does not already convey.

References reviewed while drafting this section:

- Strong Help Center, “About Rest Timer”: https://help.strongapp.io/article/231-rest-timer
- Stronglifts Support, “How to Use The Rest Timer”: https://support.stronglifts.com/article/39-timer
- StrengthMark Help Center, “Rest Timer”: https://www.strengthmark.com/help/v1.65/rest-timer
- RYSE Help, “Rest Timer”: https://www.ryseapp.io/help/rest-timer
- Seconds Interval Timer, “Sound Settings”: https://www.intervaltimer.com/help/settings/sound-settings

---

## 5. Definitions

### 5.1 Cue

A cue is an audio and/or haptic signal triggered by a workout event.

### 5.2 Rep completion

A rep completion occurs when the timed duration for the current rep reaches its end.

### 5.3 Set completion

A set completion occurs when all reps required for the current set are complete.

For bilateral exercises, this is after the configured reps for the set.

For unilateral exercises, this is after both sides for the set are complete. Completing only the first side is a **side-switch event**, not a set-completion event.

For alternating exercises, this is after both sides have completed the configured reps for the set.

### 5.4 Exercise completion

An exercise completion occurs when all required work for the current exercise is complete.

For reps exercises, this is after the final set completes.

For duration exercises, this is after the duration reaches zero.

### 5.5 Session completion

A session completion occurs when the final exercise is complete and the session is marked complete.

---

## 6. Desired Cue Taxonomy

| Workout event | Cue | Default sound direction | Setting gate |
| --- | --- | --- | --- |
| Exercise countdown step | About-to-start countdown | Rising 3-2-1 tones | `soundEnabled` + `audioLeadInEnabled` |
| Duration exercise starts | Duration start | Bright start tone | `soundEnabled` |
| Duration exercise about to end | About-to-end countdown | Descending 3-2-1 tones | `soundEnabled` + `audioExerciseAboutToEndEnabled` |
| Duration exercise ends without about-to-end countdown | Duration end | Lower end tone | `soundEnabled` |
| Rep starts | Rep start | Crisp high cue | `soundEnabled` |
| Rep ends | Rep end | Crisp medium-high cue | `soundEnabled` |
| Side switch needed | Switch sides | Resonant side-switch gong/chime | `soundEnabled` |
| Set completes | Set complete | Warm meditation-style gong | `soundEnabled` |
| Rest starts | Rest start | Low rest cue | `soundEnabled` + `audioRestCuesEnabled` |
| Rest ends | Rest end | Medium rest-end cue | `soundEnabled` + `audioRestCuesEnabled` |
| Between-exercise preparation starts | Transition start | Currently rest-start cue; future distinct cue optional | `soundEnabled` + `audioRestCuesEnabled` |
| Between-exercise preparation ends | Transition end | Currently rest-end cue; future distinct cue optional | `soundEnabled` + `audioRestCuesEnabled` |
| Session completes | Session complete | Ascending completion chime | `soundEnabled` |

---

## 7. End-of-Set Cue Requirements

### 7.1 Triggering rules

The set-complete cue must trigger when a reps-based set completes.

It must trigger for:

1. bilateral non-final sets,
2. bilateral final sets,
3. unilateral set completion after the second side,
4. alternating set completion after both sides finish,
5. final set before moving to the next exercise,
6. final set before completing the session.

It must not trigger for:

1. duration exercises,
2. completion of only the first side of a unilateral set,
3. skipped exercises,
4. manually finishing a session early,
5. jumping to another exercise before the set completes.

### 7.2 Timing rules

Default behavior:

1. Play normal rep-end cue at rep completion time.
2. Schedule set-complete cue for `repCompletionTime + 700ms`.
3. Allow a configurable constant in code, e.g. `SET_COMPLETE_CUE_DELAY_MS = 700`.
4. The delay may later become user-configurable, but that is not required in the first implementation.

Accepted delay range:

- Minimum: 500ms
- Default: 700ms
- Maximum: 1000ms

### 7.3 Rest anchoring rules

The set-complete cue delay must not delay rest start.

For non-final sets with rest:

1. Complete the set.
2. Play rep-end cue immediately.
3. Start rest accounting immediately.
4. Schedule set-complete cue for 700ms later.
5. Do not use set-complete cue playback as the rest timer trigger.

### 7.4 Transition interaction rules

The set-complete cue may overlap with UI state transitions, but it should not overlap with other audio cues.

Implementation must account for:

1. rest-start cue,
2. rest-end cue,
3. session-complete cue,
4. side-switch cue,
5. setup/start cue for next set when rest is zero.

Recommended first-pass policy:

1. Preserve rep-end cue at `T=0`.
2. Suppress or delay rest-start cue when a set-complete gong is scheduled, because a rest-start cue near `T=0` can compete with the gong at `T=700ms`.
3. Keep rest-end cue at the actual end of rest if rest cues are enabled.
4. If rest duration is shorter than the set-complete cue delay, suppress the delayed set-complete cue rather than interfering with the next set. This is an edge case for very short rests.
5. If session-complete cue is scheduled after the final set, preserve the set-complete gong first, then play session-complete cue after a clear separation.

### 7.5 Final exercise/session behavior

For the final set of a non-final exercise:

1. Play final rep-end cue.
2. Schedule set-complete gong after 700ms.
3. Proceed to next-exercise transition according to auto-advance settings.
4. Avoid playing next transition cue on top of set-complete gong.

For the final set of the final exercise:

1. Play final rep-end cue.
2. Schedule set-complete gong after 700ms.
3. Play session-complete cue after the set-complete gong has had enough perceptual space.
4. Recommended minimum: session-complete cue starts no earlier than 2.0 seconds after the final rep-end cue and no earlier than 1.0 second after the set-complete gong starts.

### 7.6 Cue priority and suppression matrix

When a single moment completes multiple semantic scopes, the player must decide whether to play a set cue, an exercise cue, a session cue, or a subset of them. The goal is to maximize useful information while minimizing cue clutter.

Use this priority model:

1. **Rep-end cue is atomic and highest priority at the moment of rep completion.** It marks the user's movement timing and should not be replaced by set/exercise/session cues.
2. **Set-complete cue is the next priority for reps exercises.** It confirms closure of the set, including final sets. It is delayed so it does not merge with the rep-end cue.
3. **Exercise-complete cue is informational and should be conditional.** It should play only when it tells the user something different from set completion, such as completion of a duration exercise or transition to another exercise without a set context.
4. **Session-complete cue is the highest-level summary cue, but it should be delayed behind the lower-level movement/set cues.** It should not replace the final rep-end or final set-complete cue unless the final set-complete cue was intentionally suppressed because timing would be confusing.

Recommended first-pass playback decisions:

| Completed scope at this moment | Immediate cue | Delayed cue(s) | Suppress / avoid | Notes |
| --- | --- | --- | --- | --- |
| Non-final rep in a set | Rep end | None | Set/exercise/session cues | Normal rep timing. |
| Non-final set in reps exercise | Rep end | Set-complete gong at +700ms | Rest-start cue by default when it would clutter the gong | Rest timer starts at rep completion, not gong playback. |
| Final set of non-final reps exercise | Rep end | Set-complete gong at +700ms; optional next-exercise transition cue after clear spacing | Generic reps exercise-end cue unless a future distinct cue adds value | The set-complete gong is enough to indicate closure of the reps work. |
| Final set of final reps exercise | Rep end | Set-complete gong at +700ms; session-complete cue after clear spacing | Generic reps exercise-end cue | This yields movement closure, set closure, then session closure. |
| Duration exercise completed, non-final exercise | Duration end, or about-to-end countdown sequence | Optional next-exercise transition cue after clear spacing | Set-complete cue | Duration exercises have no set-complete cue. |
| Final duration exercise completed | Duration end, or about-to-end countdown sequence | Session-complete cue after clear spacing | Set-complete cue | Session cue remains useful because there is no final set gong. |
| First side of unilateral set completed | Side-switch cue | None, or rest-start cue only if it is clearly spaced | Set-complete cue | First side is a phase transition, not set completion. |

Exercise-complete cue policy for reps exercises:

1. Do not add a separate generic reps exercise-end tone in the first implementation.
2. Treat the final set-complete gong as the exercise-complete cue for reps exercises.
3. Use visual state and next-exercise transition UI/cues to communicate that the exercise changed.
4. Revisit only if user testing shows that the end of a reps exercise is unclear.

Session-complete cue policy:

1. Always preserve the final movement cue first: rep-end for reps, duration-end/countdown for duration.
2. For reps sessions, preserve final set-complete gong unless rest/transition timing makes it actively confusing.
3. Play session-complete cue after the final set-complete gong with enough separation to be heard as session-level closure.
4. If the final set-complete gong has a long decay, session-complete may need to start later than the current 2-second delay. Prefer clarity over speed because the workout is already done.

---

## 8. Sound Design Requirements

### 8.1 Set-complete gong

The set-complete sound should be warm, pleasant, and less urgent than rep cues.

Preferred characteristics:

1. Resonant decay of approximately 1.5-2.5 seconds.
2. Soft attack to avoid clicks but still be noticeable.
3. Lower-mid pitch range than rep cues.
4. No harsh square/sawtooth timbres.
5. Clearly different from the existing session-complete ascending chime.
6. Clearly different from the existing unilateral side-switch chime.

Synthetic implementation options:

1. Extend existing `playChime()` with parameters for frequency, duration, and volume envelope.
2. Layer two or three quiet sine oscillators with slight detuning or harmonic intervals.
3. Use a lower root than the side-switch cue to make set completion feel like closure.
4. Apply exponential decay over about 2 seconds.

Suggested initial tone:

- root around `392Hz` (G4) or `440Hz` (A4),
- optional quiet octave or fifth overtone,
- 2-second exponential decay,
- master-volume-scaled peak below the rep cue peak if needed.

### 8.2 Haptics

Set-complete haptics should be distinct but not disruptive.

Recommended pattern:

1. One medium vibration pulse, or
2. two gentle pulses spaced similarly to the audio onset.

Avoid making it too similar to session-complete haptics.

---

## 9. Cue Orchestration Design

### 9.1 Centralize cue decisions

The current cue logic is embedded directly in timer loops and duplicated between normal start and resume paths. Implementation should introduce a small orchestration layer inside the player or a shared utility.

Recommended functions:

```ts
function handleRepCompletionCue(context: RepCompletionCueContext): void;
function handleSetCompletionCue(context: SetCompletionCueContext): void;
function handleSideSwitchCue(context: SideSwitchCueContext): void;
function resolveCompletionCuePriority(context: CompletionScopeContext): CuePlan;
function scheduleDelayedCue(cue: DelayedCue): void;
function clearScheduledCues(): void;
```

The exact names may differ, but the implementation should ensure:

1. one place decides whether the current rep completion is also a side switch or set completion,
2. one place schedules delayed set-complete cues,
3. one place resolves set-vs-exercise-vs-session cue priority,
4. pause/skip/exit cleanup cancels pending delayed cues,
5. normal and resume paths call the same cue-decision functions.

### 9.2 Pending cue cleanup

Any delayed cue scheduled with `setTimeout` must be tracked and cleared when appropriate.

Clear pending delayed cues when:

1. user pauses before the cue fires,
2. user skips exercise,
3. user jumps to another exercise,
4. user exits session,
5. user finishes session manually,
6. component is destroyed,
7. a new session/player instance loads.

Open design decision:

- If the user pauses immediately after completing a set but before the set-complete gong fires, should the cue still play?

Recommended first-pass behavior:

- If set completion already occurred, allow the set-complete cue to play even if the player state becomes `resting`.
- Cancel it only for explicit navigation/destructive controls such as skip, jump, exit, finish, or component destroy.
- If implementation complexity is high, cancel on pause as a conservative fallback and document the behavior.

### 9.3 Avoid hard-coded timing drift

Review existing `300ms` delays before and after rest. Replace ad hoc overlap-prevention delays with documented cue-spacing rules.

Required outcome:

- A configured rest duration should remain semantically accurate.
- Delayed audio cues should not silently extend rest duration.

---

## 10. Settings and Preview UI

### 10.1 Existing settings

Use existing settings for the first implementation:

1. `soundEnabled` gates all audio.
2. `soundVolume` controls master volume.
3. `hapticsEnabled` gates haptics.
4. `audioLeadInEnabled` gates about-to-start countdown.
5. `audioExerciseAboutToEndEnabled` gates about-to-end countdown.
6. `audioRestCuesEnabled` gates rest start/end cues.

### 10.2 New settings

No new user-visible setting is required for the initial implementation.

Optional future settings:

1. Enable/disable set-complete cue.
2. Set-complete cue delay.
3. Set-complete cue volume multiplier.
4. Separate enable/disable for rep cues.
5. Separate enable/disable for side-switch cues.

### 10.3 Preview UI

The Audio Settings modal should continue to include a `Set Complete` preview button.

Preview behavior should use the same audio method as the real player cue, but it does not need to simulate the 700ms delay because the user intentionally clicked the preview button.

The informational text should clarify that cues include:

1. exercise start and completion,
2. rep start/end,
3. side switch where applicable,
4. set completion,
5. rest start/end,
6. session completion.

---

## 11. Duration Cue Fix Requirements

Correct the duration-exercise end cue gating.

Current intended behavior:

1. If `audioExerciseAboutToEndEnabled` is true, play descending 3-2-1 about-to-end countdown during the last three seconds.
2. If `audioExerciseAboutToEndEnabled` is false, play a single duration-end tone at completion.
3. This decision must not depend on `audioLeadInEnabled`.
4. The same rule must apply in both fresh-start and resume paths.

---

## 12. Demo Mode Requirements

The demo player must match production cue behavior unless demo mode explicitly documents a deviation.

Implementation should update demo mode for:

1. delayed set-complete cue,
2. final-set cue behavior,
3. duration end cue setting fix,
4. cue cleanup on pause/skip/jump/exit if those controls exist in demo mode.

---

## 13. Acceptance Criteria

### 13.1 Bilateral reps exercise, three sets, 10-second rest

Given a reps exercise with 3 sets and 10 seconds rest between sets:

1. Each normal rep starts with rep-start cue.
2. Each rep ends with rep-end cue.
3. At the final rep of set 1:
   - rep-end cue plays immediately,
   - rest timer starts immediately,
   - set-complete gong plays 500-1000ms later,
   - next set starts at the configured rest boundary, not at gong boundary.
4. Same behavior occurs at the final rep of set 2.
5. At the final rep of set 3:
   - rep-end cue plays immediately,
   - set-complete gong plays 500-1000ms later,
   - exercise completion proceeds after preserving cue spacing.

### 13.2 Bilateral reps exercise, one set

Given a reps exercise with 1 set:

1. The final rep-end cue plays.
2. The set-complete gong plays 500-1000ms later.
3. If this is not the final exercise, next-exercise transition follows without overlapping the gong.
4. If this is the final exercise, session completion cue follows with clear separation.

### 13.3 Unilateral exercise

Given a unilateral exercise with left and right sides:

1. Completing the first side triggers the side-switch cue, not the set-complete cue.
2. Completing the second side triggers the rep-end cue and then the delayed set-complete gong.
3. If more sets remain, rest timing starts from second-side completion, not from the gong.

### 13.4 Alternating exercise

Given an alternating exercise:

1. Side alternation does not trigger set-complete cue per side.
2. Set-complete cue fires only after the full alternating set is complete.
3. Final set behavior matches bilateral final set behavior.

### 13.5 Duration exercise

Given a duration exercise:

1. No set-complete cue plays.
2. About-to-end countdown is controlled by `audioExerciseAboutToEndEnabled`.
3. If about-to-end countdown is disabled, a duration-end cue plays at completion.

### 13.6 Manual controls

When a user skips, jumps, exits, or manually finishes:

1. No stale delayed set-complete cue should fire for a set that is no longer current.
2. No delayed cue from a previous exercise should play over a new exercise.

### 13.7 Cue priority at exercise/session boundaries

When a reps set is also the end of an exercise:

1. The final rep-end cue plays immediately.
2. The set-complete gong plays after the configured delay.
3. No additional generic reps exercise-end tone plays in the first implementation.

When a reps set is also the end of the session:

1. The final rep-end cue plays immediately.
2. The set-complete gong plays after the configured delay.
3. The session-complete cue plays after clear separation from the set-complete gong.
4. The session-complete cue must not cause the final set-complete gong to be omitted unless an explicitly documented short-rest/zero-rest suppression rule applies.

When a duration exercise is also the end of the session:

1. The duration end cue or about-to-end countdown completes according to settings.
2. No set-complete gong plays.
3. The session-complete cue plays after clear separation.

---

## 14. Test Plan

### 14.1 Unit-level tests, if timer logic is extractable

Preferred tests:

1. cue sequence for bilateral reps,
2. cue sequence for unilateral reps,
3. cue sequence for alternating reps,
4. final-set cue scheduling,
5. final-session cue spacing,
6. set-vs-exercise-vs-session cue priority,
7. duration-end setting behavior,
8. pending delayed cue cleanup.

### 14.2 Component/integration tests

If existing test infrastructure supports it:

1. mount the player with fake timers,
2. simulate exercise timing,
3. spy on `audioService` methods,
4. assert cue call order and delays.

### 14.3 Manual audio QA

Manual QA should verify:

1. set-complete gong is pleasant and distinctive,
2. final rep-end cue remains audible,
3. gong does not merge with rep-end cue,
4. gong does not clash with rest-start/rest-end cues,
5. final set and final session sound sequence is understandable,
6. behavior is acceptable on mobile browsers.

---

## 15. Implementation Notes

### 15.1 Suggested first implementation sequence

1. Add or refactor `AudioService.onSetComplete()` to use a warmer resonant gong sound.
2. Add a delayed cue scheduling helper in the player.
3. Replace in-line final-rep cue substitution with normal rep-end cue plus delayed set-complete scheduling.
4. Ensure set-complete scheduling occurs for final sets as well as non-final sets.
5. Implement the cue-priority matrix for set/exercise/session boundaries.
6. Anchor rest timing to set completion and remove timing drift where feasible.
7. Fix duration about-to-end setting gate.
8. Deduplicate cue decision logic between `startSingleRep()` and `resumeRepsExercise()`.
9. Update demo player.
10. Update Audio Settings modal text if needed.
11. Add tests or documented manual QA.

### 15.2 Suggested constants

```ts
const SET_COMPLETE_CUE_DELAY_MS = 700;
const MIN_SET_COMPLETE_CUE_DELAY_MS = 500;
const MAX_SET_COMPLETE_CUE_DELAY_MS = 1000;
const MIN_SESSION_COMPLETE_AFTER_SET_CUE_MS = 1000;
```

### 15.3 Risk areas

1. Browser timer throttling when screen is locked or tab is backgrounded.
2. Mobile browser audio-unlock requirements.
3. Long gong decay overlapping short rest intervals.
4. Existing progress/timer state coupling in the player.
5. Differences between production and demo routes.
6. Pause/resume edge cases during rest or between reps.

---

## 16. Open Questions

Questions 1, 3, 4, and 5 were resolved during implementation. Questions 2 and 6 remain
open and are deferred; both were already flagged as optional/future work in §10.2 and §7.6.

1. Should the rest-start cue be suppressed whenever a set-complete gong is scheduled?
   - **Resolved: yes.** On set completion the rest timer is started with the rest-start cue
     suppressed (`startRestTimer(false)`), because the gong plays at +700ms *inside* the rest
     window and a rest-start cue near `T=0` would compete with it. Rest *timing* is unaffected
     — only the cue is dropped. The rest-end cue is unchanged.

2. Should users eventually be able to disable set-complete cues independently of all sound?
   - **Open — deferred.** No new setting was added. The cue is gated by `soundEnabled` only,
     as specified in §10.2.

3. Should the set-complete gong use the same family of sound as the unilateral side-switch
   gong, or should it be lower/warmer to signal closure?
   - **Resolved: lower and warmer.** It reuses the same `playChime()` family as the side-switch
     cue but is rooted at G4 (392Hz) against the side-switch's C5 (523.25Hz), with a quiet D5
     overtone (587.33Hz at 30% volume) and a 2-second exponential decay.

4. Should a zero-rest next set be delayed enough to allow the set-complete gong, or should the
   set-complete gong be suppressed for zero-rest sets?
   - **Resolved: suppress the gong**, per the policy already stated in §7.4 item 4. When
     `restBetweenSets` is 0 on a **non-final** set, the gong is not scheduled and the next set
     begins immediately, so a configured zero-rest transition keeps its timing (§9.3). Final
     sets always play the gong regardless of the rest setting, because nothing follows them
     inside the exercise for it to interfere with.
   - An earlier implementation delayed the next set by 1000ms to make room for the gong. That
     inverted §7.4 item 4 — it interfered with the next set instead of yielding — and silently
     turned a deliberate zero-rest exercise into a ~1s rest after every set. Corrected before
     merge.

5. Should a separate reps exercise-end cue ever exist, or should final set-complete always
   serve that role?
   - **Resolved: no separate cue.** The final set-complete gong serves as the exercise-end cue
     for reps exercises, per the policy in §7.6.

6. Should the session-complete cue be redesigned if the final set-complete gong already feels
   like completion?
   - **Open — deferred.** The session-complete cue is unchanged. The pre-existing 2-second
     delay in `completeSession()` supplies the separation required by §7.5.

---

## 17. Success Definition

This work is successful when a user performing a reps-based exercise can clearly hear:

1. each rep start,
2. each rep end,
3. each completed set as a separate pleasant gong shortly after the final rep,
4. rest completion and/or next-start timing without drift,
5. exercise/session completion without confusing overlap.

Most importantly, a 10-second rest should still feel like a 10-second rest measured from the final rep, while the end-of-set gong plays inside that rest window as a non-blocking cue.

---

## 18. Implementation Status

Implemented on `claude/review-cue-logic-end-set-ybwdtx`, targeting `main`.

### 18.1 Delivered

1. **Warm set-complete gong** (§8.1) — `AudioService.onSetComplete()` plays a G4 (392Hz)
   root via `playChime()` with a quiet D5 overtone at 30% volume and a 2-second exponential
   decay, replacing the previous short G5→D5 two-note chime.
2. **Two gentle haptic pulses** 250ms apart (§8.2), distinct from the side-switch cue's
   long-short pattern and from the session-complete triple pulse.
3. **Rep-end cue is no longer replaced** (§7.1, §7.2). It fires on every rep, including the
   final rep of every set. The gong is scheduled separately at
   `SET_COMPLETE_CUE_DELAY_MS = 700`ms after it.
4. **Gong fires for all sets** — non-final sets, final set of an exercise, and the final set
   of the final exercise (§7.1 items 1-6).
5. **Rest anchored to set completion, not to the gong** (§7.3). The delayed cue never gates
   the rest timer.
6. **Rest-start cue suppressed** when a gong is scheduled (§7.4, resolves §16.1).
7. **Zero-rest non-final sets suppress the gong** rather than delaying the next set, so the
   configured zero-rest timing is preserved (§7.4 item 4, §9.3; resolves §16.4). Final sets
   keep the gong regardless of the rest setting.
8. **Pending-cue cleanup** (§9.2) — the scheduled gong is cancelled on skip, jump, previous,
   exit, manual finish, and component destroy via `clearPendingSetCompleteCue()`, which
   `clearTimers()` also calls. It is deliberately allowed to fire through a pause, per the
   recommended first-pass behavior in §9.2.
9. **Duration about-to-end gating fixed** (§11) — both the fresh-start and resume paths now
   gate on `audioExerciseAboutToEndEnabled` instead of the incorrect `audioLeadInEnabled`.
10. **Demo player kept in sync** (§12) — identical changes applied to
    `src/routes/demo/play/+page.svelte`.
11. **Settings modal cue list updated** (§10.3) to name rep start/end and side switch, and to
    drop the now-inaccurate "multi-set exercises" qualifier from set completion.

### 18.2 Deferred — not implemented

1. **Cue orchestration layer (§9.1, §15.1 item 8).** The cue decisions remain inline in the
   timer loops and are duplicated in four places: the start and resume paths of the production
   player, and the same two paths in the demo player. The recommended
   `handleRepCompletionCue()` / `scheduleDelayedCue()` / `clearScheduledCues()` extraction was
   not done. Behavior is correct, but any future cue change must be made in all four sites.
2. **Automated tests (§14.1, §14.2).** The repository has no test infrastructure at all — no
   test script in `package.json`, no vitest or playwright config. Adding the specified unit and
   component tests requires standing up a harness first. Verification to date is the manual
   audio QA in §14.3 against the branch preview deployment.
3. **Ad hoc 300ms delays (§9.3).** The pre-existing 300ms delay before `startRestTimer()` was
   left in place rather than folded into a documented cue-spacing rule. It predates this work
   and is small relative to any configured rest, but it does mean rest starts ~300ms after the
   final rep rather than exactly at it.

### 18.3 Known minor edge case

§7.4 item 4 covers rests shorter than the cue delay. Two cases arise in practice:

- **Zero rest** on a non-final set: the gong is suppressed and the next set starts immediately,
  per §16.4. This is the case §7.4 item 4 was written for.
- **One-second rest**: because `restBetweenSets` is expressed in whole seconds, the shortest
  non-zero rest is 1000ms, which already exceeds the 700ms cue delay — so the gong starts well
  before rest ends and is not suppressed. Its 2-second decay will still be sounding when the
  rest-end cue fires. This is audible but not disruptive, and was judged not worth a special
  case.
