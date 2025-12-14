// import { Routes } from '@angular/router';
// import { Dashboard } from './dashboard/dashboard';
// import { MenuItems } from './menu-items/menu-items';
// import { Invoice } from './invoice/invoice';
// import { OrderDetails } from './order-details/order-details';
// import { AdminDashboard } from './admin-dashboard/admin-dashboard';
// import { UpdateInvoice } from './update-invoice/update-invoice';
// import { ExpenseList } from './expense-list/expense-list';

// export const routes: Routes = [
//     { path: '', component: Dashboard },
//     { path: 'menu-items/:category', component: MenuItems },
//     { path: 'invoice', component: Invoice },
//     { path: 'edit-invoice', component: UpdateInvoice },
//     { path: 'order-details', component: OrderDetails },
//     {
//         path: 'admin',
//         loadComponent: () =>
//             import('./admin-dashboard/admin-dashboard')
//                 .then(m => m.AdminDashboard),
//         children: [

//             { path: '', redirectTo: 'expense-list', pathMatch: 'full' },

//             {
//                 path: 'expense-list',
//                 loadComponent: () =>
//                     import('./expense-list/expense-list')
//                         .then(m => m.ExpenseList)
//             },
//         ]
//     }

// ];

import { Routes } from '@angular/router';

export const routes: Routes = [

  // ===== EXISTING ROUTES (NO CHANGE) =====
  { path: '', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },

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
        path: 'purchase',
        loadComponent: () =>
          import('./add-expense/add-expense')
            .then(m => m.AddExpense)
      }
    ]
  }

];
