import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReturnsRoutingModule } from './returns-routing.module';
import { ReturnsComponent } from './returns.component';

@NgModule({
  declarations: [ReturnsComponent],
  imports: [SharedModule, ReturnsRoutingModule],
})
export class ReturnsModule {}
