import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  stats: any = null;
  top: any[] = [];
  recentTransactions: any[] = [];
  lowStockItems: any[] = [];
  salesChartData: ChartConfiguration<'line'>['data'] | null = null;

  bar: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [{ data: [] }] };
  barOptions: ChartConfiguration<'bar'>['options'] = { 
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } }
    }
  };

  salesChartOptions: ChartConfiguration<'line'>['options'] = {
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
            if (value === null) return 'Sales: N/A';
            return `Sales: Rs. ${value.toFixed(2)}`;
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
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true
      },
      point: {
        radius: 5,
        backgroundColor: '#4f46e5',
        borderColor: '#fff',
        borderWidth: 2,
        hoverRadius: 7
      }
    }
  };

  constructor(private api: ApiService) {
    // this.loadDashboardData();
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Load stats
    this.api.get<any>('/dashboard/stats').subscribe(r => this.stats = r.data);
    
    // Load top products
    // this.api.get<any>('/dashboard/top-products').subscribe(r => {
    //   this.top = r.data || [];
    //   this.bar.labels = this.top.map(x => x.name);
    //   (this.bar.datasets[0].data as any) = this.top.map(x => x.qtySold);
    //   this.bar.datasets[0].backgroundColor = '#4f46e5';
    //   this.bar.datasets[0].borderRadius = 8;
    // });
    this.api.get<any>('/dashboard/top-products').subscribe(r => {
      this.top = r.data || [];

      this.bar = {
        labels: this.top.map(x => x.name),
        datasets: [
          {
            data: this.top.map(x => x.qtySold),
            backgroundColor: '#4f46e5',
            borderRadius: 8
          }
        ]
      };
    });

    // Load recent transactions
    this.api.get<any>('/sales', { limit: 5, sort: 'createdAt', order: 'desc' }).subscribe(r => {
      this.recentTransactions = (r.data || []).slice(0, 5);
    });

    // Load low stock items
    this.api.get<any>('/products').subscribe(r => {
      const products = r.data || [];
      this.lowStockItems = products
        .filter((p: any) => p.stockQty > 0 && p.stockQty <= p.reorderLevel)
        .slice(0, 5);
    });

    // Load sales chart data (last 7 days)
    this.loadSalesChart();
  }

  loadSalesChart() {
    const last7Days: any = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date);
    }

    this.api.get<any>('/sales').subscribe(r => {
      const sales = r.data || [];
      
      const dailySales = last7Days.map((date: any) => {
        const dateStr = date.toISOString().split('T')[0];
        const daySales = sales.filter((s: any) => {
          const saleDate = new Date(s.createdAt).toISOString().split('T')[0];
          return saleDate === dateStr;
        });
        const total = daySales.reduce((sum: number, s: any) => sum + (s.grandTotal || 0), 0);
        return total;
      });

      this.salesChartData = {
        labels: last7Days.map((d: any) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Sales',
          data: dailySales,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4
        }]
      };
    });
  }
}
