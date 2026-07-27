import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

export type DatePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

@Component({
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  from: Date | null = null;
  to: Date | null = null;
  selectedPreset: DatePreset = 'this_month';
  summary: any = null;
  isLoading = false;

  // Charts data
  revenueChartData?: ChartConfiguration<'line'>['data'];
  categoryChartData?: ChartConfiguration<'doughnut'>['data'];
  topProductsData?: ChartConfiguration<'bar'>['data'];

  // Chart options
  revenueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return 'Revenue: Rs. 0.00';
            return `Revenue: Rs. ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => 'Rs. ' + Number(value).toLocaleString()
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        grid: { display: false }
      }
    },
    elements: {
      line: {
        tension: 0.35,
        borderWidth: 3,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.12)',
        fill: true
      },
      point: {
        radius: 4,
        backgroundColor: '#4f46e5',
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverRadius: 7
      }
    }
  };

  categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 16,
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return ` ${label}: Rs. ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    }
  };

  topProductsOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Sold: ${context.parsed.x} units`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      y: {
        grid: { display: false }
      }
    }
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.selectPreset('this_month');
  }

  /**
   * Convert a Date object to yyyy-MM-dd string for API calls
   */
  toApiDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectPreset(preset: DatePreset) {
    this.selectedPreset = preset;
    const now = new Date();

    if (preset === 'today') {
      this.from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'this_week') {
      const current = new Date();
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(current.getFullYear(), current.getMonth(), diff);
      this.from = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
      this.to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'this_month') {
      this.from = new Date(now.getFullYear(), now.getMonth(), 1);
      this.to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'this_year') {
      this.from = new Date(now.getFullYear(), 0, 1);
      this.to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    // 'custom' maintains current manually selected from/to dates

    this.load();
  }

  onCustomDateChange() {
    this.selectedPreset = 'custom';
    this.load();
  }

  load() {
    if (!this.from || !this.to) return;
    this.isLoading = true;
    const params = { from: this.toApiDate(this.from), to: this.toApiDate(this.to) };

    // 1. Load summary metrics
    this.api.get<any>('/reports/summary', params).subscribe({
      next: (r) => {
        this.summary = r.data || {};
      },
      error: (err) => console.error('Failed to load summary', err)
    });

    // 2. Load revenue trend chart
    this.api.get<any>('/reports/revenue-trend', params).subscribe({
      next: (r) => {
        const trend = r.data || [];
        const labels = trend.map((t: any) => {
          if (!t.date) return '';
          const parts = t.date.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          return t.date;
        });
        const values = trend.map((t: any) => t.revenue);

        this.revenueChartData = {
          labels,
          datasets: [{
            label: 'Revenue',
            data: values,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            fill: true,
            tension: 0.35
          }]
        };
      },
      error: (err) => console.error('Failed to load revenue trend', err)
    });

    // 3. Load sales by category
    this.api.get<any>('/reports/sales-by-category', params).subscribe({
      next: (r) => {
        const categories = r.data || [];
        const labels = categories.map((c: any) => c.category || 'General');
        const values = categories.map((c: any) => c.totalRevenue);

        this.categoryChartData = {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              '#4f46e5',
              '#10b981',
              '#f59e0b',
              '#3b82f6',
              '#ec4899',
              '#8b5cf6',
              '#14b8a6',
              '#f97316',
              '#06b6d4',
              '#64748b'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        };
      },
      error: (err) => console.error('Failed to load category sales', err)
    });

    // 4. Load top products
    this.api.get<any>('/reports/top-products', { ...params, limit: 10 }).subscribe({
      next: (r) => {
        const products = r.data || [];
        this.topProductsData = {
          labels: products.map((p: any) => p.name),
          datasets: [{
            data: products.map((p: any) => p.qtySold),
            backgroundColor: '#10b981',
            borderRadius: 6,
            label: 'Quantity Sold'
          }]
        };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load top products', err);
        this.isLoading = false;
      }
    });
  }
}
