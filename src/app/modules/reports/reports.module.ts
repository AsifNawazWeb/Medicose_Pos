import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { ReportsComponent } from './reports.component';
import { NgChartsModule } from 'ng2-charts';

@NgModule({
  declarations: [ReportsComponent],
  imports: [SharedModule, NgChartsModule, ReportsRoutingModule],
})
export class ReportsModule {}
