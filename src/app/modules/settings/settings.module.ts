import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { SecurityComponent } from './security/security.component';

@NgModule({
  declarations: [SettingsComponent, SecurityComponent],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}
