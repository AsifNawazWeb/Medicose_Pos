import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService, UserRecord } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  template: `
    <h2 mat-dialog-title>Reset Password</h2>
    <mat-dialog-content>
      <p class="reset-info">
        Set a temporary password for <strong>{{ data.user.name }}</strong>.
        They will be required to change it on their next login.
      </p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>New password</mat-label>
          <input matInput type="password" formControlName="newPassword" required />
          <mat-hint>Minimum 8 characters</mat-hint>
          <mat-error *ngIf="form.controls.newPassword.invalid">Password must be at least 8 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Confirm password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" required />
          <mat-error *ngIf="form.hasError('passwordMismatch')">Passwords do not match</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || loading" (click)="save()">
        <mat-icon>lock_reset</mat-icon>
        Reset Password
      </button>
    </mat-dialog-actions>
  `,
})
export class ResetPasswordDialogComponent {
  form: any;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toast: ToastService,
    public dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: UserRecord }
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: any) {
    const pwd = form.get('newPassword')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  save() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;

    this.userService.resetPassword(this.data.user.id, this.form.value.newPassword).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Password reset successfully');
        this.dialogRef.close(true);
      },
      error: () => (this.loading = false),
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}