# Analysis & Recommendations: Session Player Timer Behavior

### **Current Implementation (from spec)**

Your app currently implements:
1. **Between exercises**: Manual pause after each exercise completion - user must manually start next exercise
2. **Between reps** (within a set): Auto-advance (no pause)
3. **Between sets**: Manual pause - user must manually trigger next set

### **Industry Best Practices**

Leading fitness tracking apps like Hevy, Fitbod, and Setgraph use automatic rest timers that start counting down as soon as a set is completed, with typical defaults ranging from 30-90 seconds for hypertrophy training and 2-5 minutes for strength training. Here's what I found:

#### **Standard Patterns**

1. **Between Sets** (Most Common):
   - Automatic countdown timer starts immediately after marking a set complete, with audio/vibration notification when rest is complete
   - Users can adjust rest periods in 15-30 second increments during active workout
   - Global default settings + per-exercise overrides
   - Typical ranges: 30-90s for hypertrophy, 2-5 minutes for strength

2. **Between Reps** (Within Same Set):
   - Generally no delays for traditional strength training
   - For stretching/PT exercises with holds, apps count up or down the hold duration per rep

3. **Between Exercises**:
   - Most strength apps: Manual trigger to start next exercise
   - Interval/HIIT timers: Configurable delays (typically 5-30 seconds) between exercises

#### **PT-Specific Patterns**

Physical therapy apps like PT Timer provide voice cues for timing holds, rest periods, and transitions between exercises, with emphasis on precise hold durations for stretching exercises. Key differences from strength training:

- Emphasis on **hold duration** for stretches (15-30+ seconds)
- Voice guidance for "prepare," "start," "switch sides," "rest"
- Often more prescribed/rigid timing vs. intuitive rest
- Exercises categorized as "hold", "no-hold", or "fixed duration" types

### **Recommendations for Your App**

#### **Phase 1: Configurable Rest Between Sets (High Priority)**

**Implementation:**
1. **Global Settings**:
   - Default rest time between sets (e.g., 60 seconds)
   - Option to enable/disable auto-rest
   
2. **Per-Exercise Override**:
   - Each exercise can have custom rest duration
   - Shown during exercise definition/editing

3. **During Session Playback**:
   - After set completes: Start automatic countdown
   - Large, clear countdown display
   - Audio cue when rest ends (beep/vibration)
   - Allow manual start of next set before timer ends
   - Buttons to +15s / -15s adjust active timer

**User Control:**
- Toggle in Settings: "Auto-rest between sets" (ON/OFF)
- When OFF: Maintains current manual trigger behavior
- When ON: Uses automatic countdown

#### **Phase 2: Between-Exercise Delays (Medium Priority)**

**For auto-play feature:**
1. **Configurable Prep Time**:
   - Setting: "Preparation time between exercises" (0-60 seconds)
   - Default: 10-15 seconds
   - Countdown with "Next: [Exercise Name]" display

2. **Smart Defaults**:
   - Longer prep if equipment/position changes significantly
   - Could eventually analyze exercise transitions

#### **Phase 3: Full Auto-Play Session (Lower Priority)**

**Considerations:**
- Most useful for familiar routines
- Less useful when learning new exercises
- Preserve ability to pause/skip at any time
- Setting: "Auto-play entire session" toggle

### **Recommended Implementation Plan**

```
 **TODO List:**

 Phase 1: Between-Sets Rest Timer
 ☐ Add global setting: "Default rest between sets" (seconds, 0-300)
 ☐ Add global toggle: "Enable automatic rest timer" (default: ON)
 ☐ Add per-exercise rest duration override in exercise definitions
 ☐ Update SessionPlayer to use rest timers when enabled
   ☐ After set completion, show countdown overlay
   ☐ Add +15s / -15s adjustment buttons
   ☐ Add "Start Now" button to skip remaining rest
   ☐ Play audio cue when rest timer reaches 0
 ☐ Maintain current manual trigger as fallback when auto-rest disabled
 ☐ Update UI to show rest timer state clearly

 Phase 2: Exercise Transitions (Future)
 ☐ Add setting: "Preparation time between exercises" 
 ☐ Implement transition countdown with next exercise preview
 ☐ Allow skip to start immediately

 Phase 3: Full Auto-Play (Future)
 ☐ Add toggle: "Auto-play entire session"
 ☐ Chain exercises automatically with prep times
 ☐ Ensure pause/skip controls remain accessible

 Testing & Refinement:
 ☐ Test with actual PT exercises (your wife's feedback!)
 ☐ Ensure accessibility (large text, high contrast timers)
 ☐ Verify audio cues work even when screen locked
 ☐ Test various timing combinations (short/long sets, quick transitions)
```

### **Key Design Principles**

1. **Simplicity First**: Start with between-sets only (most impactful)
2. **User Control**: Always allow manual override/skip
3. **Sensible Defaults**: 60s rest is reasonable starting point for PT
4. **PT-Specific**: Your use case is rehabilitation, not powerlifting - shorter, more controlled rest periods
5. **Progressive Enhancement**: Build features incrementally based on actual usage

### **Why This Approach?**

1. **Between-sets timing is the #1 pain point** - currently requires manual trigger every time
2. **PT exercises often need consistent rest** - unlike strength training where "feel" matters more
3. **Your wife's use case**: Repetitive, familiar exercises benefit most from automation
4. **Maintains your "simplicity" principle**: Features are opt-in, don't complicate basic flow
