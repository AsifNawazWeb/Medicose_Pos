import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private snack: MatSnackBar) {}

  success(msg: string) {
    this.snack.open('✓  ' + msg, 'OK', { duration: 3500, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['toast-success'] });
  }
  error(msg: string) {
    this.snack.open('✗  ' + msg, 'Dismiss', { duration: 6000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['toast-error'] });
  }
  warning(msg: string) {
    this.snack.open('⚠  ' + msg, 'OK', { duration: 4500, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['toast-warning'] });
  }
  info(msg: string) {
    this.snack.open('ℹ  ' + msg, 'OK', { duration: 3500, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['toast-info'] });
  }
}
