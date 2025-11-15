<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Journal Screen - Session history and calendar
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { ptState } from '$lib/stores/pt';
  import { ptService } from '$lib/services/PTService';
  import BottomTabs from '$lib/components/BottomTabs.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import type { SessionInstance, Exercise } from '$lib/types/pt';

  let sessionInstances: SessionInstance[] = [];
  let selectedSession: SessionInstance | null = null;
  let showDetailsModal = false;
  let loading = true;

  // Statistics
  let totalSessions = 0;
  let completedSessions = 0;
  let thisWeekSessions = 0;
  let thisMonthSessions = 0;

  onMount(async () => {
    await loadSessions();
  });

  async function loadSessions() {
    loading = true;
    try {
      const instances = await ptService.getSessionInstances();
      // Sort by date descending (newest first)
      sessionInstances = instances.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      calculateStatistics();
    } catch (error) {
      console.error('Failed to load session instances:', error);
    } finally {
      loading = false;
    }
  }

  function calculateStatistics() {
    totalSessions = sessionInstances.length;
    completedSessions = sessionInstances.filter(s => s.status === 'completed').length;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    thisWeekSessions = sessionInstances.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekAgo && s.status === 'completed';
    }).length;

    thisMonthSessions = sessionInstances.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= monthAgo && s.status === 'completed';
    }).length;
  }

  function openSessionDetails(session: SessionInstance) {
    selectedSession = session;
    showDetailsModal = true;
  }

  function closeDetailsModal() {
    showDetailsModal = false;
    selectedSession = null;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  function formatTime(isoString: string | undefined): string {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatDuration(seconds: number | undefined): string {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  }

  function getSessionDuration(session: SessionInstance): number {
    if (!session.startTime || !session.endTime) return 0;
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return Math.floor((end - start) / 1000);
  }

  function getCompletionPercentage(session: SessionInstance): number {
    const total = session.completedExercises.length;
    if (total === 0) return 0;
    const completed = session.completedExercises.filter(e => e.completed).length;
    return Math.round((completed / total) * 100);
  }

  function getStatusBadgeClass(status: string, manuallyLogged?: boolean): string {
    if (manuallyLogged) {
      return 'status-badge status-manually-logged';
    }
    switch (status) {
      case 'completed':
        return 'status-badge status-completed';
      case 'in-progress':
        return 'status-badge status-in-progress';
      case 'planned':
        return 'status-badge status-planned';
      default:
        return 'status-badge';
    }
  }

  function getStatusIcon(status: string, manuallyLogged?: boolean): string {
    if (manuallyLogged) {
      return 'edit_note';
    }
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'in-progress':
        return 'play_circle';
      case 'planned':
        return 'schedule';
      default:
        return 'circle';
    }
  }

  function getStatusText(status: string, manuallyLogged?: boolean): string {
    if (manuallyLogged) {
      return 'Manually Logged';
    }
    return status;
  }

  function getExerciseName(exerciseId: number): string {
    const exercise = $ptState.exercises.find(e => e.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  }
</script>

<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Journal</h1>
      <p class="header-subtitle">Your session history and progress</p>
    </header>

    <!-- Statistics Section -->
    {#if !loading && totalSessions > 0}
      <section class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{completedSessions}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{thisWeekSessions}</div>
          <div class="stat-label">This Week</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{thisMonthSessions}</div>
          <div class="stat-label">This Month</div>
        </div>
      </section>
    {/if}

    <!-- Session History List -->
    <section class="sessions-section">
      {#if loading}
        <div class="loading-state">
          <span class="material-icons loading-icon">hourglass_empty</span>
          <p>Loading sessions...</p>
        </div>
      {:else if sessionInstances.length === 0}
        <div class="empty-state">
          <div class="empty-icon">
            <span class="material-icons">book</span>
          </div>
          <h2>No Sessions Yet</h2>
          <p>
            Complete your first session to start tracking your progress!
          </p>
        </div>
      {:else}
        <div class="sessions-list">
          {#each sessionInstances as session (session.id)}
            <button
              class="session-card"
              on:click={() => openSessionDetails(session)}
            >
              <div class="session-header">
                <div class="session-date-time">
                  <div class="session-date">{formatDate(session.date)}</div>
                  {#if session.startTime}
                    <div class="session-time">{formatTime(session.startTime)}</div>
                  {/if}
                </div>
                <div class={getStatusBadgeClass(session.status, session.manuallyLogged)}>
                  <span class="material-icons status-icon">{getStatusIcon(session.status, session.manuallyLogged)}</span>
                  {getStatusText(session.status, session.manuallyLogged)}
                </div>
              </div>

              <div class="session-body">
                <h3 class="session-name">{session.sessionName}</h3>
                <div class="session-meta">
                  <span class="meta-item">
                    <span class="material-icons meta-icon">fitness_center</span>
                    {session.completedExercises.length} exercises
                  </span>
                  {#if session.status === 'completed'}
                    <span class="meta-item">
                      <span class="material-icons meta-icon">timer</span>
                      {formatDuration(getSessionDuration(session))}
                    </span>
                  {/if}
                </div>

                {#if session.status !== 'planned'}
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      style="width: {getCompletionPercentage(session)}%"
                    ></div>
                  </div>
                  <div class="progress-text">
                    {getCompletionPercentage(session)}% complete
                  </div>
                {/if}
              </div>

              <div class="session-footer">
                <span class="view-details">
                  View Details
                  <span class="material-icons">chevron_right</span>
                </span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <BottomTabs currentTab="journal" />
</div>

<!-- Session Details Modal -->
{#if showDetailsModal && selectedSession}
  <Modal title="Session Details" on:close={closeDetailsModal}>
    <div class="details-container">
      <div class="details-header">
        <h2>{selectedSession.sessionName}</h2>
        <div class="details-date">{formatDate(selectedSession.date)}</div>
      </div>

      <div class="details-stats">
        <div class="detail-stat">
          <div class="detail-stat-label">Status</div>
          <div class="detail-stat-value">
            <span class={getStatusBadgeClass(selectedSession.status, selectedSession.manuallyLogged)}>
              <span class="material-icons status-icon">{getStatusIcon(selectedSession.status, selectedSession.manuallyLogged)}</span>
              {getStatusText(selectedSession.status, selectedSession.manuallyLogged)}
            </span>
          </div>
        </div>
        {#if selectedSession.startTime}
          <div class="detail-stat">
            <div class="detail-stat-label">Start Time</div>
            <div class="detail-stat-value">{formatTime(selectedSession.startTime)}</div>
          </div>
        {/if}
        {#if selectedSession.endTime}
          <div class="detail-stat">
            <div class="detail-stat-label">End Time</div>
            <div class="detail-stat-value">{formatTime(selectedSession.endTime)}</div>
          </div>
        {/if}
        {#if selectedSession.status === 'completed'}
          <div class="detail-stat">
            <div class="detail-stat-label">Duration</div>
            <div class="detail-stat-value">{formatDuration(getSessionDuration(selectedSession))}</div>
          </div>
        {/if}
      </div>

      <div class="exercises-section">
        <h3>Exercises</h3>
        <div class="exercises-list">
          {#each selectedSession.completedExercises as completedEx, index}
            <div class="exercise-item" class:completed={completedEx.completed} class:skipped={completedEx.skipped}>
              <div class="exercise-number">{index + 1}</div>
              <div class="exercise-details">
                <div class="exercise-name">{getExerciseName(completedEx.exerciseId)}</div>
                {#if completedEx.actualDuration}
                  <div class="exercise-duration">
                    Duration: {formatDuration(completedEx.actualDuration)}
                  </div>
                {/if}
              </div>
              <div class="exercise-status">
                {#if completedEx.completed}
                  <span class="material-icons status-check">check_circle</span>
                {:else if completedEx.skipped}
                  <span class="material-icons status-skip">skip_next</span>
                {:else}
                  <span class="material-icons status-pending">radio_button_unchecked</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      {#if selectedSession.notes}
        <div class="notes-section">
          <h3>Notes</h3>
          <p>{selectedSession.notes}</p>
        </div>
      {/if}
    </div>
  </Modal>
{/if}

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--surface);
  }

  .content {
    flex: 1;
    padding-bottom: calc(var(--bottom-tabs-height) + var(--spacing-lg));
    overflow-y: auto;
  }

  .page-header {
    padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
    background-color: var(--surface);
    border-bottom: 1px solid var(--divider);
  }

  .page-header h1 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  /* Statistics Section */
  .stats-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  .stat-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    text-align: center;
    box-shadow: var(--shadow);
  }

  .stat-value {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: var(--spacing-xs);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  /* Sessions Section */
  .sessions-section {
    padding: 0 var(--spacing-lg) var(--spacing-lg);
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    text-align: center;
  }

  .loading-icon {
    font-size: 3rem;
    color: var(--primary-color);
    margin-bottom: var(--spacing-md);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .empty-icon {
    margin-bottom: var(--spacing-lg);
  }

  .empty-icon .material-icons {
    font-size: 4rem;
    color: var(--primary-color);
  }

  .empty-state h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    max-width: 300px;
  }

  /* Session Cards */
  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .session-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    text-align: left;
    width: 100%;
  }

  .session-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-sm);
  }

  .session-date-time {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .session-date {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-time {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-icon {
    font-size: 1rem;
  }

  .status-completed {
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  .status-manually-logged {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  .status-in-progress {
    background-color: #fff3e0;
    color: #ef6c00;
  }

  .status-planned {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  .session-body {
    margin-bottom: var(--spacing-sm);
  }

  .session-name {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-meta {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .meta-icon {
    font-size: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: var(--divider);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--primary-color-dark));
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .session-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--spacing-xs);
    border-top: 1px solid var(--divider);
  }

  .view-details {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-size-sm);
    color: var(--primary-color);
    font-weight: 500;
  }

  .view-details .material-icons {
    font-size: 1.25rem;
  }

  /* Modal Styles */
  .details-container {
    padding: var(--spacing-md);
  }

  .details-header {
    margin-bottom: var(--spacing-lg);
  }

  .details-header h2 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-xl);
    color: var(--text-primary);
  }

  .details-date {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .details-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .detail-stat {
    background-color: var(--surface);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
  }

  .detail-stat-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .detail-stat-value {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .exercises-section {
    margin-bottom: var(--spacing-lg);
  }

  .exercises-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .exercises-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .exercise-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background-color: var(--surface);
    border-radius: var(--border-radius);
    border-left: 3px solid var(--divider);
  }

  .exercise-item.completed {
    border-left-color: #4caf50;
  }

  .exercise-item.skipped {
    border-left-color: #ff9800;
    opacity: 0.7;
  }

  .exercise-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background-color: var(--primary-color);
    color: white;
    border-radius: 50%;
    font-size: var(--font-size-sm);
    font-weight: 600;
    flex-shrink: 0;
  }

  .exercise-details {
    flex: 1;
  }

  .exercise-name {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.125rem;
  }

  .exercise-duration {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .exercise-status {
    flex-shrink: 0;
  }

  .status-check {
    color: #4caf50;
  }

  .status-skip {
    color: #ff9800;
  }

  .status-pending {
    color: var(--divider);
  }

  .notes-section h3 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .notes-section p {
    margin: 0;
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-lg);
    }

    .page-header h1 {
      font-size: var(--font-size-lg);
    }

    .stats-section {
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
    }

    .stat-card {
      padding: var(--spacing-sm);
    }

    .stat-value {
      font-size: var(--font-size-xl);
    }

    .sessions-section {
      padding: 0 var(--spacing-md) var(--spacing-md);
    }

    .details-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
