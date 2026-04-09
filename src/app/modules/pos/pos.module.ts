import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PosRoutingModule } from './pos-routing.module';
import { PosComponent } from './pos.component';

@NgModule({
  declarations: [PosComponent],
  imports: [SharedModule, PosRoutingModule],
})
export class PosModule {}
