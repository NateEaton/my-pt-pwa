# Claude Code Web + Local Testing Workflow Cheatsheet

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Start new thread in Claude Code Web                     │
│    → Claude creates feature branch from main                │
│    → Work together on changes in that branch                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Local Testing (Optional)                                 │
│    → Pull branch locally                                    │
│    → Test changes                                           │
│    → Make fixes if needed (locally or in Claude Code)       │
│    → Commit and push back to branch                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Complete Work & Merge                                    │
│    → Claude creates PR                                      │
│    → Review and merge PR on GitHub                          │
│    → Continue working in same branch for future changes     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Sync Local Repository (THIS CHEATSHEET)                  │
│    → Update main branch to get merged changes               │
│    → Keep feature branch for continued work                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Scenario A: You DID Pull the Branch Locally for Testing

**After merging PR on GitHub, update main but keep the feature branch for continued work.**

### Step-by-Step

```bash
# 1. Make sure you're in the project directory
cd /path/to/my-pt-pwa

# 2. Check current branch
git branch
# You might still be on the feature branch

# 3. Switch to main
git checkout main

# 4. Fetch latest from GitHub
git fetch origin

# 5. Check status (should show you're behind)
git status
# Expected: "Your branch is behind 'origin/main' by X commits"

# 6. Pull the merged changes
git pull

# 7. Switch back to feature branch to continue working
git checkout claude/feature-branch-name-here

# 8. Verify you're clean
git status
```

### Quick Copy-Paste Version

```bash
cd /path/to/my-pt-pwa
git checkout main
git fetch origin
git pull
git checkout claude/your-feature-branch-name
git status
```

---

## Scenario B: You DID NOT Pull the Branch Locally

**After merging PR on GitHub, you just need to update main.**

### Step-by-Step

```bash
# 1. Make sure you're in the project directory
cd /path/to/my-pt-pwa

# 2. Check current branch (should already be on main)
git branch

# 3. Fetch latest from GitHub
git fetch origin

# 4. Check status
git status
# Expected: "Your branch is behind 'origin/main' by X commits"

# 5. Pull the merged changes
git pull

# 6. Verify you're clean
git status
# Expected: "On branch main, Your branch is up to date with 'origin/main'"
```

### Quick Copy-Paste Version

```bash
cd /path/to/my-pt-pwa
git fetch origin
git pull
git status
```

---

## When to Delete Branches

**Branch Cleanup Strategy:**

- **During active development:** Keep the feature branch - you'll continue working in it
- **After multiple PRs:** Keep the branch until you're done with that chat session
- **When archiving chat session:** Delete the branch locally (GitHub branches kept for history)

### Deleting a Branch When Archiving

```bash
# Switch to main first
git checkout main

# Delete the local feature branch
git branch -D claude/feature-branch-name

# Clean up remote tracking reference
git fetch origin --prune

# Note: GitHub branch remains as archival history unless manually deleted on GitHub
```

---

## If You Made Local Changes During Testing

### Committed Changes (Already Pushed)
✅ You're good! The changes are already in the branch on GitHub and will be included in the PR merge.

### Uncommitted Changes (Not Yet Committed)

```bash
# Option 1: Commit and push them
git add .
git commit -m "Local testing fixes"
git push

# Then follow Scenario A above after PR merge

# Option 2: Stash them for later
git stash save "Testing changes"
# Switch to main, pull, etc.
# Then apply stash if needed
git stash pop
```

### Committed But Not Pushed

```bash
# Push your commits to the feature branch
git push

# Then complete the PR merge on GitHub
# Then follow Scenario A above
```

---

## Emergency: "I'm Confused About My State"

### Full Status Check

```bash
# Where am I?
git branch
# Shows current branch with * marker

# What's my relationship to GitHub?
git status

# What branches exist locally?
git branch -a

# What's the history?
git log --oneline -5

# What files are modified?
git status --short
```

### Nuclear Option: Start Fresh

⚠️ **WARNING: This discards all local changes!**

```bash
# Make sure you're on main
git checkout main

# Throw away all local changes
git reset --hard origin/main

# Clean up any leftover files
git clean -fd

# Verify clean state
git status
```

---

## Common Issues & Solutions

### Issue: "Your branch has diverged from 'origin/main'"

**Cause:** You have local commits that aren't on GitHub, AND GitHub has commits you don't have locally.

**Solution:**
```bash
# If your local commits aren't important
git reset --hard origin/main

# If you need to keep local commits
git pull --rebase
# Then resolve any conflicts
```

### Issue: Can't delete branch - "not fully merged"

**Cause:** Git thinks the branch isn't merged (can happen with PR squash merges).

**Solution:**
```bash
# Force delete (use -D instead of -d)
git branch -D claude/feature-branch-name
```

### Issue: Pulled wrong branch or on wrong branch

**Solution:**
```bash
# Just switch to the correct branch
git checkout main
# or
git checkout claude/correct-feature-branch
```

---

## Best Practices

### ✅ DO

- Always start from main when Claude creates a new branch
- Commit frequently when making local changes
- Push local changes before asking Claude to work on the same files
- Use `git status` liberally to check your state
- Keep feature branches during active development
- Sync main after PR merges to stay up to date

### ❌ DON'T

- Don't make commits directly to `main` locally
- Don't force push (`git push -f`) to shared branches
- Don't delete branches until you're done with the chat session
- Don't panic if you see warnings - read them carefully

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| See current branch | `git branch` |
| Switch to main | `git checkout main` |
| Switch to feature branch | `git checkout claude/branch-name` |
| Update from GitHub | `git fetch origin` |
| Pull latest changes | `git pull` |
| Check status | `git status` |
| See all branches | `git branch -a` |
| Delete local branch | `git branch -d branch-name` |
| Force delete branch | `git branch -D branch-name` |
| Clean up old remote refs | `git fetch origin --prune` |
| See recent commits | `git log --oneline -10` |
| Discard all local changes | `git reset --hard origin/main` |

---

## Common Workflows

**After PR merge (pulled locally) - Continue working:**

```bash
git checkout main && git fetch origin && git pull && git checkout claude/your-branch && git status
```

**After PR merge (didn't pull locally):**

```bash
git fetch origin && git pull && git status
```

**When archiving chat session (cleanup):**

```bash
git checkout main && git branch -D claude/old-branch-name && git fetch origin --prune
```

---

## Testing Checklist

When you pull a feature branch locally for testing:

- [ ] `git fetch origin`
- [ ] `git checkout claude/feature-branch-name`
- [ ] `npm install` (if dependencies changed)
- [ ] `npm run build` (verify it builds)
- [ ] Test the functionality
- [ ] If you make fixes:
  - [ ] `git add .`
  - [ ] `git commit -m "Description"`
  - [ ] `git push`
- [ ] When done testing, you can stay on the branch or switch back: `git checkout main`

---

## Visual Branch Flow

```
main (local)
  ↓ fetch/pull
main (GitHub) ←─────────────────────┐
  ↓                                  │
  └→ claude/feature-branch ──────────┤
       ↓ (work together)              │
       ↓ (optional: pull locally)     │
       ↓ (make changes, test)         │
       ↓ (push changes)               │
       ↓                              │
       └→ Create PR                   │
           └→ Merge PR ───────────────┘
              ↓
          main (GitHub) updated
              ↓
          git fetch origin
          git pull (on main)
              ↓
          main (local) updated ✓
              ↓
          Continue working in
          claude/feature-branch
          for future changes
```

---

## When to Use Each Command

**After PR merge (pulled locally):**
```
git checkout main → git fetch origin → git pull → git checkout feature-branch
```

**After PR merge (didn't pull locally):**
```
git fetch origin → git pull
```

**Before starting work on a new feature (new chat session):**
```
git fetch origin → git pull → (wait for Claude to create new branch)
```

**To continue work in existing chat session:**
```
Stay in claude/feature-branch or git checkout claude/feature-branch
```

**If you need to test Claude's changes:**
```
git fetch origin → git checkout claude/branch-name → test → (stay or switch)
```

**If you made local changes to test:**
```
git add . → git commit → git push → (then continue with PR)
```

---

## Support

If you ever get stuck:

1. Run `git status` and read the output carefully
2. Check what branch you're on: `git branch`
3. See recent history: `git log --oneline -5`
4. If all else fails, the nuclear option works (see above)

Remember: Git is forgiving. As long as you've pushed changes to GitHub, you can always recover them.

---

**Last Updated:** 2025-11-16
**Your Project:** my-pt-pwa
**Your Remote:** github.com:NateEaton/my-pt-pwa
**Branch Strategy:** Keep branches during active development, archive when chat session complete
