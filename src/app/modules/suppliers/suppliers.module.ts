import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SuppliersRoutingModule } from './suppliers-routing.module';
import { SuppliersComponent } from './suppliers.component';

@NgModule({
  declarations: [SuppliersComponent],
  imports: [SharedModule, SuppliersRoutingModule],
})
export class SuppliersModule {}
