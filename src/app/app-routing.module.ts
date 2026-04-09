import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule),
  },

  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'pos', loadChildren: () => import('./modules/pos/pos.module').then(m => m.PosModule) },
      { path: 'products', loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule) },
      { path: 'sales', loadChildren: () => import('./modules/sales/sales.module').then(m => m.SalesModule) },
      { path: 'suppliers', loadChildren: () => import('./modules/suppliers/suppliers.module').then(m => m.SuppliersModule) },
      { path: 'customers', loadChildren: () => import('./modules/customers/customers.module').then(m => m.CustomersModule) },
      { path: 'reports', loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule) },
      { path: 'returns', loadChildren: () => import('./modules/returns/returns.module').then(m => m.ReturnsModule) },
      { path: 'purchase-orders', loadChildren: () => import('./modules/purchase-orders/purchase-orders.module').then(m => m.PurchaseOrdersModule) },
      { path: 'settings', loadChildren: () => import('./modules/settings/settings.module').then(m => m.SettingsModule) },
    ],
  },

  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
