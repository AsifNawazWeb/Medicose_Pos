import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductsComponent } from './products.component';

@NgModule({
  declarations: [ProductsComponent],
  imports: [SharedModule, ProductsRoutingModule],
})
export class ProductsModule {}
