import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard },

  { path: 'menu-items/:category', loadComponent: () => import('./menu-items/menu-items').then(m => m.MenuItems) },

  { path: 'invoice', loadComponent: () => import('./invoice/invoice').then(m => m.Invoice) },

  { path: 'edit-invoice', loadComponent: () => import('./update-invoice/update-invoice').then(m => m.UpdateInvoice) },

  { path: 'order-details', loadComponent: () => import('./order-details/order-details').then(m => m.OrderDetails) },

  // ===== ADMIN LAYOUT ROUTE =====
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard')
        .then(m => m.AdminDashboard),
    children: [

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'expense-list',
        loadComponent: () =>
          import('./expense-list/expense-list')
            .then(m => m.ExpenseList)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./login/login')
            .then(m => m.Login)
      },
      {
        path: 'add-expense',
        loadComponent: () =>
          import('./add-expense/add-expense')
            .then(m => m.AddExpense)
      },
      {
        path:'detailed-orders',
        loadComponent: () =>
          import('./detailed-orders/detailed-orders')        
            .then(m => m.DetailedOrders)
      },
      {
        path:'reports',
        loadComponent: () =>
          import('./admin-reports/admin-reports')        
            .then(m => m.AdminReports)
      }
    ]
  }

];
