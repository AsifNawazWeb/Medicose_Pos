import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserService, UserRecord } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserDialogComponent } from './user-dialog.component';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';

@Component({
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: UserRecord[] = [];
  loading = false;
  currentUserId: number | null = null;
  displayedColumns = ['name', 'email', 'role', 'status', 'lastLogin', 'actions'];

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {
    this.currentUserId = this.auth.currentUser?.id ?? null;
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.list().subscribe({
      next: (res) => {
        this.users = res.data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadUsers();
    });
  }

  openEditDialog(user: UserRecord) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: { mode: 'edit', user },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadUsers();
    });
  }

  openResetPasswordDialog(user: UserRecord) {
    const dialogRef = this.dialog.open(ResetPasswordDialogComponent, {
      width: '420px',
      data: { user },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadUsers();
    });
  }

  toggleActive(user: UserRecord) {
    if (user.id === this.currentUserId) {
      this.toast.warning('You cannot disable your own account');
      return;
    }

    const newState = !user.isActive;
    const action = newState ? 'enable' : 'disable';

    if (!confirm(`Are you sure you want to ${action} user "${user.name}"?`)) return;

    this.userService.setActive(user.id, newState).subscribe({
      next: () => {
        this.toast.success(`User ${action}d successfully`);
        this.loadUsers();
      },
      error: () => {},
    });
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleString();
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      manager: 'Manager',
      cashier: 'Cashier',
      viewer: 'Viewer',
    };
    return labels[role] || role;
  }
}