import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PurchaseOrdersRoutingModule } from './purchase-orders-routing.module';
import { PurchaseOrdersComponent } from './purchase-orders.component';

@NgModule({
  declarations: [PurchaseOrdersComponent],
  imports: [SharedModule, PurchaseOrdersRoutingModule],
})
export class PurchaseOrdersModule {}
