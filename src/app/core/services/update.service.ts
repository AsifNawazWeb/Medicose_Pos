import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UpdateStatus =
  | 'idle'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string | null;
  percent?: number;
  error?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private _state = new BehaviorSubject<UpdateState>({ status: 'idle' });
  state$ = this._state.asObservable();

  private readonly available = !!window.medpos?.update;

  constructor() {
    if (!this.available) {
      // Running in a plain browser (dev mode) — no updater in the main process
      this._state.next({ status: 'disabled' });
      return;
    }

    // Sync with the current state in the main process (covers the background
    // check that already ran on startup) and listen for live status changes.
    window.medpos!.update!.getState().then(s => this._state.next(s)).catch(() => {});
    window.medpos!.update!.onStatus(s => this._state.next(s));
  }

  get state(): UpdateState {
    return this._state.getValue();
  }

  /** Trigger a manual check. Resolves with the resulting state. */
  check(): Promise<UpdateState> {
    if (!this.available) return Promise.resolve({ status: 'disabled' });
    return window.medpos!.update!.check()
      .then(s => {
        this._state.next(s);
        return s;
      })
      .catch(() => ({ status: 'error', error: 'Update check failed' }));
  }

  /** Quit the app and install the downloaded update. */
  install(): void {
    if (!this.available) return;
    window.medpos!.update!.install();
  }
}
