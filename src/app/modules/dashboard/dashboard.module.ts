import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { NgChartsModule } from 'ng2-charts';

@NgModule({
  declarations: [DashboardComponent],
  imports: [SharedModule, NgChartsModule, DashboardRoutingModule],
})
export class DashboardModule {}
