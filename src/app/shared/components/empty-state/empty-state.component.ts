import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="surface box" role="status" aria-live="polite">
      <div class="icon" aria-hidden="true">{{ icon }}</div>
      <div class="title">{{ title }}</div>
      <div class="desc" *ngIf="description">{{ description }}</div>
    </div>
  `,
  styles: [`
    .box { padding:22px; text-align:center; }
    .icon { font-size:34px; opacity:.9; }
    .title { font-weight:700; margin-top:8px; }
    .desc { color: var(--app-muted); margin-top:6px; }
  `],
})
export class EmptyStateComponent {
  @Input() icon = '📦';
  @Input() title = 'Nothing here yet';
  @Input() description = '';
}
