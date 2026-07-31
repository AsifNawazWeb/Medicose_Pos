import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  storeName: string = '';
  storeAddress: string = '';
  stats: any = null;
  top: any[] = [];
  recentTransactions: any[] = [];
  lowStockItems: any[] = [];
  salesChartData: ChartConfiguration<'line'>['data'] | null = null;
  private refreshTimer: any;

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

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboardData();
    // Auto-refresh dashboard data every 60 seconds so cards reset after 12am midnight & stay updated
    this.refreshTimer = setInterval(() => this.loadDashboardData(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadDashboardData() {
    // Load store settings for banner
    this.api.get<any>('/settings').subscribe(r => {
      const s = r.data;
      this.storeName = s.storeName || '';
      this.storeAddress = s.storeAddress || '';
    });

    // Load stats (today's stats, resets daily)
    this.api.get<any>('/dashboard/stats').subscribe(r => this.stats = r.data);
    
    // Load top products (last 30 days)
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

    // Load sales chart data (last 30 days)
    this.loadSalesChart();
  }

  loadSalesChart() {
    const last30Days: any[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30Days.push(date);
    }

    this.api.get<any>('/sales').subscribe(r => {
      const sales = r.data || [];
      
      const dailySales = last30Days.map((date: any) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const daySales = sales.filter((s: any) => {
          if (!s.createdAt) return false;
          const sDate = new Date(s.createdAt);
          const sYear = sDate.getFullYear();
          const sMonth = String(sDate.getMonth() + 1).padStart(2, '0');
          const sDay = String(sDate.getDate()).padStart(2, '0');
          return `${sYear}-${sMonth}-${sDay}` === dateStr;
        });
        return daySales.reduce((sum: number, s: any) => sum + (s.grandTotal || 0), 0);
      });

      this.salesChartData = {
        labels: last30Days.map((d: any) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
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
