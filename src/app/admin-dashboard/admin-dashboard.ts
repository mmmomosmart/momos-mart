import { Component, inject } from '@angular/core';
import { PrinterService } from '../service/printer-service';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { AuthService } from '../service/auth-service';
import { Capacitor } from '@capacitor/core';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: Array<'admin' | 'cashier'>;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIcon, MatChipsModule, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboard {
  auth = inject(AuthService);

  constructor(private printer: PrinterService, private router: Router) { }

  ngOnInit() {
    // if (Capacitor.isNativePlatform()) {
    //   document.body.classList.add('native-app');
    // }
  }

  adminMenuItems: MenuItem[] = [
    // { label: 'Dashboard', icon: 'home', route: 'dashboard', roles: ['admin', 'cashier'] },
    { label: 'Reports', icon: 'description', route: 'reports', roles: ['admin'] },
    { label: 'Sales List', icon: 'shopping_cart', route: 'detailed-orders', roles: ['admin', 'cashier'] },
    { label: 'Add Expense', icon: 'inventory', route: 'add-expense', roles: ['admin'] },
    { label: 'Expense List', icon: 'request_quote', route: 'expense-list', roles: ['admin'] },
    // { label: 'Estimate List', icon: 'assignment', route: 'estimate', roles: ['admin'] },
    // { label: 'Sale List', icon: 'receipt_long', route: 'sales', roles: ['admin', 'cashier'] },
    //{ label: 'Money In List', icon: 'currency_rupee', route: '/money-in', roles: ['admin'] }
  ];

  subadminMenuItems: MenuItem[] = [
    { label: 'Purchase List', icon: 'inventory', route: 'purchase', roles: ['admin'] },
    { label: 'Expense List', icon: 'request_quote', route: 'expense-list', roles: ['admin'] }
  ]

  logout() {
    this.auth.logout();
    // this.router.navigateByUrl('/admin/dashboard');
    this.router.navigateByUrl('/');
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}

