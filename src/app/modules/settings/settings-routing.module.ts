import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { SecurityComponent } from './security/security.component';

const routes: Routes = [
  { path: '', component: SettingsComponent },
  { path: 'security', component: SecurityComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
