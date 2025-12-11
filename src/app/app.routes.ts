import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { MenuItems } from './menu-items/menu-items';
import { Invoice } from './invoice/invoice';
import { OrderDetails } from './order-details/order-details';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';

export const routes: Routes = [
    { path: '', component: Dashboard},
    { path: 'menu-items/:category', component: MenuItems},
    { path: 'invoice', component: Invoice},
    { path: 'order-details', component: OrderDetails},
    { path: 'admin', component: AdminDashboard}
];
