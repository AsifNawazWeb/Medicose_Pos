import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { SetupComponent } from './setup/setup.component';

@NgModule({
  declarations: [LoginComponent, SetupComponent],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}