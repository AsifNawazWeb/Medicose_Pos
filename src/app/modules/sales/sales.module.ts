import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SalesRoutingModule } from './sales-routing.module';
import { SalesComponent } from './sales.component';

@NgModule({
  declarations: [SalesComponent],
  imports: [SharedModule, SalesRoutingModule],
})
export class SalesModule {}
