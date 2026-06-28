import { describe, it, expect, vi } from 'vitest';
import { TimerStateMachine } from '../timerStateMachine';
import { Preset } from '../../domain/entities';

const mockPreset: Preset = {
  id: "test",
  name: "Test Breathing",
  description: "Test description",
  theme: "forest",
  type: "standard",
  phases: [
    {
      name: "Phase 1",
      repeats: 2,
      stages: [
        { name: "Inhale", duration: 2, type: "inhale" },
        { name: "Exhale", duration: 1, type: "exhale" }
      ]
    },
    {
      name: "Phase 2",
      repeats: 1,
      stages: [
        { name: "Hold", duration: null, type: "hold" } // manual hold
      ]
    }
  ]
};

describe('TimerStateMachine', () => {
  it('should initialize with first stage of first phase', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);
    const state = sm.getState();

    expect(state.currentPhaseIndex).toBe(0);
    expect(state.currentStageIndex).toBe(0);
    expect(state.currentRepetition).toBe(0);
    expect(state.timeRemaining).toBe(2);
    expect(state.timeElapsed).toBe(0);
    expect(state.isPlaying).toBe(false);
  });

  it('should play, pause, and tick correctly', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);

    sm.play();
    expect(sm.getState().isPlaying).toBe(true);

    sm.tick();
    expect(sm.getState().timeRemaining).toBe(1);
    expect(sm.getState().timeElapsed).toBe(1);

    sm.pause();
    expect(sm.getState().isPlaying).toBe(false);
  });

  it('should transition to next stage when countdown finishes', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);

    sm.play();
    sm.tick(); // 2 -> 1
    sm.tick(); // 1 -> 0 (transition)

    const state = sm.getState();
    expect(state.currentStageIndex).toBe(1); // Exhale
    expect(state.timeRemaining).toBe(1); // duration of Exhale
    expect(state.timeElapsed).toBe(0);
    expect(callback).toHaveBeenCalledWith(expect.anything(), 'stage-changed');
  });

  it('should repeat phase based on repetitions', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);

    sm.play();
    sm.tick(); sm.tick(); // Inhale complete (rep 0)
    sm.tick(); // Exhale complete (rep 0) -> should transition to rep 1 Inhale

    const state = sm.getState();
    expect(state.currentRepetition).toBe(1);
    expect(state.currentStageIndex).toBe(0); // back to Inhale
    expect(state.timeRemaining).toBe(2);
  });

  it('should transition to next phase after repetitions complete', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);

    sm.play();
    
    // Rep 0
    sm.tick(); sm.tick(); // Inhale
    sm.tick(); // Exhale
    
    // Rep 1
    sm.tick(); sm.tick(); // Inhale
    sm.tick(); // Exhale -> completes rep 1 -> should transition to Phase 2 (Hold)

    const state = sm.getState();
    expect(state.currentPhaseIndex).toBe(1);
    expect(state.currentStageIndex).toBe(0);
    expect(state.timeRemaining).toBeNull(); // manual hold
  });

  it('should count up during manual holds and store result on skip', () => {
    const callback = vi.fn();
    const sm = new TimerStateMachine(mockPreset, callback);

    sm.play();
    // Fast forward to Phase 2 (Manual Hold)
    // Rep 0
    sm.tick(); sm.tick(); sm.tick();
    // Rep 1
    sm.tick(); sm.tick(); sm.tick();

    expect(sm.getState().currentPhaseIndex).toBe(1);
    expect(sm.getState().timeRemaining).toBeNull();

    // Tick manual hold
    sm.tick(); // 1 sec elapsed
    sm.tick(); // 2 sec elapsed
    expect(sm.getState().timeElapsed).toBe(2);

    // Skip manual hold
    sm.skip();

    const state = sm.getState();
    expect(state.wimHofHolds).toEqual([2]); // should record 2s hold duration
    expect(state.isFinished).toBe(true);
    expect(callback).toHaveBeenCalledWith(expect.anything(), 'finished');
  });
});
