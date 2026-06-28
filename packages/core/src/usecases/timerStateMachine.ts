import { Preset, Stage, Phase } from '../domain/entities';

export interface TimerState {
  preset: Preset;
  currentPhaseIndex: number;
  currentStageIndex: number;
  currentRepetition: number; // 0-indexed (e.g. rep 0 of 30)
  timeRemaining: number | null; // null for manual count-up hold
  timeElapsed: number; // time elapsed in the current stage (seconds)
  isPlaying: boolean;
  isFinished: boolean;
  wimHofHolds: number[]; // stores the count-up duration (seconds) of retention stages
  totalSessionDuration: number; // total active time spent in this session
}

export type TimerCallback = (state: TimerState, event: 'tick' | 'stage-changed' | 'phase-changed' | 'finished' | 'reset') => void;

export class TimerStateMachine {
  private state: TimerState;
  private callback: TimerCallback;

  constructor(preset: Preset, callback: TimerCallback) {
    this.callback = callback;
    this.state = this.getInitialState(preset);
  }

  private getInitialState(preset: Preset): TimerState {
    const firstPhase = preset.phases[0];
    const firstStage = firstPhase.stages[0];

    return {
      preset,
      currentPhaseIndex: 0,
      currentStageIndex: 0,
      currentRepetition: 0,
      timeRemaining: firstStage.duration,
      timeElapsed: 0,
      isPlaying: false,
      isFinished: false,
      wimHofHolds: [],
      totalSessionDuration: 0
    };
  }

  getState(): TimerState {
    return { ...this.state, wimHofHolds: [...this.state.wimHofHolds] };
  }

  play() {
    if (this.state.isFinished) return;
    this.state.isPlaying = true;
    this.triggerCallback('tick');
  }

  pause() {
    this.state.isPlaying = false;
    this.triggerCallback('tick');
  }

  toggle() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset() {
    this.state = this.getInitialState(this.state.preset);
    this.triggerCallback('reset');
  }

  // Processes 1 second tick
  tick() {
    if (!this.state.isPlaying || this.state.isFinished) return;

    this.state.totalSessionDuration += 1;
    this.state.timeElapsed += 1;

    if (this.state.timeRemaining !== null) {
      // Countdown stage
      this.state.timeRemaining -= 1;
      
      if (this.state.timeRemaining <= 0) {
        this.nextStage();
        return;
      }
    }

    this.triggerCallback('tick');
  }

  // Forced skip (e.g. user hits "Next" or ends a manual hold)
  skip() {
    if (this.state.isFinished) return;
    
    const currentStage = this.getCurrentStage();
    // If we skip an open-ended/manual hold, record the duration in wimHofHolds
    if (currentStage.duration === null) {
      this.state.wimHofHolds.push(this.state.timeElapsed);
    }
    
    this.nextStage();
  }

  private nextStage() {
    const currentPhase = this.getCurrentPhase();
    
    // Check if there is a next stage in the current phase
    if (this.state.currentStageIndex < currentPhase.stages.length - 1) {
      this.state.currentStageIndex += 1;
      this.resetStageTimer();
      this.triggerCallback('stage-changed');
    } else {
      // End of stages in the current phase. Check repetitions.
      const maxReps = currentPhase.repeats; // null means repeat indefinitely
      
      if (maxReps !== null && this.state.currentRepetition >= maxReps - 1) {
        // Completed all repetitions of the current phase. Go to next phase.
        this.nextPhase();
      } else {
        // Repeat the current phase stages again
        this.state.currentRepetition += 1;
        this.state.currentStageIndex = 0;
        this.resetStageTimer();
        this.triggerCallback('stage-changed');
      }
    }
  }

  private nextPhase() {
    const preset = this.state.preset;
    
    if (this.state.currentPhaseIndex < preset.phases.length - 1) {
      this.state.currentPhaseIndex += 1;
      this.state.currentStageIndex = 0;
      this.state.currentRepetition = 0;
      this.resetStageTimer();
      this.triggerCallback('phase-changed');
    } else {
      // Completed all phases of the preset. Session finished!
      this.state.isPlaying = false;
      this.state.isFinished = true;
      this.triggerCallback('finished');
    }
  }

  private resetStageTimer() {
    const stage = this.getCurrentStage();
    this.state.timeRemaining = stage.duration;
    this.state.timeElapsed = 0;
  }

  getCurrentPhase(): Phase {
    return this.state.preset.phases[this.state.currentPhaseIndex];
  }

  getCurrentStage(): Stage {
    return this.getCurrentPhase().stages[this.state.currentStageIndex];
  }

  private triggerCallback(event: 'tick' | 'stage-changed' | 'phase-changed' | 'finished' | 'reset') {
    this.callback(this.getState(), event);
  }
}
