import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService, UserRecord, RoleOption } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create User' : 'Edit User' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="name" required />
          <mat-error *ngIf="form.controls.name.invalid">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" [readonly]="data.mode === 'edit'" required />
          <mat-error *ngIf="form.controls.email.invalid">Enter a valid email</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" [readonly]="data.mode === 'edit'" required />
          <mat-hint>Used for login</mat-hint>
          <mat-error *ngIf="form.controls.username.invalid">Username must be 3+ chars (letters, numbers, . _ -)</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role" required>
            <mat-option *ngFor="let r of roles" [value]="r.value">{{ r.label }}</mat-option>
          </mat-select>
        </mat-form-field>

        <ng-container *ngIf="data.mode === 'create'">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" required />
            <mat-hint>Minimum 8 characters. User must change on first login.</mat-hint>
            <mat-error *ngIf="form.controls.password.invalid">Password must be at least 8 characters</mat-error>
          </mat-form-field>
        </ng-container>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || loading" (click)="save()">
        <mat-icon>save</mat-icon>
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class UserDialogComponent implements OnInit {
  form: any;
  loading = false;
  roles: RoleOption[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toast: ToastService,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; user?: UserRecord }
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.data.user?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [this.data.user?.email || '', [Validators.required, Validators.email]],
      username: [this.data.user?.username || '', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.-]+$/)]],
      phone: [this.data.user?.phone || ''],
      role: [this.data.user?.role || 'cashier', [Validators.required]],
      password: ['', this.data.mode === 'create' ? [Validators.required, Validators.minLength(8)] : []],
    });

    this.userService.getRoles().subscribe({
      next: (res) => (this.roles = res.data),
      error: () => {},
    });
  }

  save() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;

    if (this.data.mode === 'create') {
      this.userService.create(this.form.value).subscribe({
        next: () => {
          this.toast.success('User created successfully');
          this.dialogRef.close(true);
        },
        error: () => (this.loading = false),
      });
    } else {
      const payload = {
        name: this.form.value.name,
        phone: this.form.value.phone || null,
        role: this.form.value.role,
      };
      this.userService.update(this.data.user!.id, payload).subscribe({
        next: () => {
          this.toast.success('User updated successfully');
          this.dialogRef.close(true);
        },
        error: () => (this.loading = false),
      });
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}