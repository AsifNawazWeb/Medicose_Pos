import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

@Component({
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  from = '';
  to = '';
  summary: any = null;
  gstRows: any[] = [];

  // Charts data
  revenueChartData?: ChartConfiguration<'line'>['data'];
  categoryChartData?: ChartConfiguration<'doughnut'>['data'];
  topProductsData?: ChartConfiguration<'bar'>['data'];

  gstLine: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  // Chart options
  revenueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;

            if (value === null) return 'GST: N/A';

            return `GST: Rs. ${value.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => 'Rs. ' + value
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        grid: { display: false }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true
      },
      point: {
        radius: 5,
        backgroundColor: '#10b981',
        borderColor: '#fff',
        borderWidth: 2,
        hoverRadius: 7
      }
    }
  };

  categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  gstChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;

            if (value === null) return 'GST: N/A';

            return `GST: Rs. ${value.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => 'Rs. ' + value
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  topProductsOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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

  constructor(private api: ApiService) {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);

    this.to = today.toISOString().split('T')[0];
    this.from = lastMonth.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.load();
  }

  load() {
    const params: any = {};
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;

    // Load summary
    this.api.get<any>('/reports/summary', params).subscribe(r => {
      this.summary = r.data;
    });

    // Load GST data
    this.api.get<any>('/reports/gst', params).subscribe(r => {
      this.gstRows = r.data || [];
      this.gstLine.labels = this.gstRows.map(x => x.day);
      this.gstLine.datasets = [{
        data: this.gstRows.map(x => x.gstValue),
        backgroundColor: '#4f46e5',
        borderRadius: 8,
        label: 'GST'
      }];
    });

    // Load revenue trend
    this.api.get<any>('/sales', params).subscribe(r => {
      const sales = r.data ?? [];

      if (!sales.length) return;

      const dailyRevenue = this.aggregateByDate(sales);

      this.revenueChartData = {
        labels: dailyRevenue.labels,
        datasets: [{
          label: 'Revenue',
          data: dailyRevenue.values,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      };
    });


    // Load category distribution
    this.api.get<any>('/products').subscribe(r => {
      const products = r.data || [];
      const categoryCount: any = {};

      products.forEach((p: any) => {
        const cat = p.category || 'Other';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      const categories = Object.keys(categoryCount);
      const counts = Object.values(categoryCount);

      this.categoryChartData = {
        labels: categories,
        datasets: [{
          data: counts as number[],
          backgroundColor: [
            '#4f46e5',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#3b82f6',
            '#ec4899',
            '#14b8a6'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      };
    });

    // Load top products
    this.api.get<any>('/dashboard/top-products').subscribe(r => {
      const products = (r.data || []).slice(0, 8);

      this.topProductsData = {
        labels: products.map((p: any) => p.name),
        datasets: [{
          data: products.map((p: any) => p.qtySold),
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          label: 'Quantity Sold'
        }]
      };
    });
  }

  aggregateByDate(sales: any[]) {
    const dateMap: any = {};

    sales.forEach(sale => {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      dateMap[date] = (dateMap[date] || 0) + sale.grandTotal;
    });

    const sortedDates = Object.keys(dateMap).sort();
    return {
      labels: sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      values: sortedDates.map(d => dateMap[d])
    };
  }
}
