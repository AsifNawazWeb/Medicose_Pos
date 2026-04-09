import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MaterialModule } from './material.module';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';

@NgModule({
  declarations: [PageHeaderComponent, EmptyStateComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MaterialModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
})
export class SharedModule {}
