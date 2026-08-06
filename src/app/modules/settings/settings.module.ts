import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { SecurityComponent } from './security/security.component';
import { UsersComponent } from './users/users.component';
import { UserDialogComponent } from './users/user-dialog.component';
import { ResetPasswordDialogComponent } from './users/reset-password-dialog.component';

@NgModule({
  declarations: [
    SettingsComponent,
    SecurityComponent,
    UsersComponent,
    UserDialogComponent,
    ResetPasswordDialogComponent,
  ],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}