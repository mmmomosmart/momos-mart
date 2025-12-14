import { Injectable, signal } from '@angular/core';

export type UserRole = 'ADMIN' | 'SUBADMIN' | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  role = signal<UserRole>(null);

  loginAsAdmin() {
    this.role.set('ADMIN');
  }

  loginAsSubAdmin() {
    this.role.set('SUBADMIN');
  }

  logout() {
    this.role.set(null);
  }

  isAdmin() {
    return this.role() === 'ADMIN';
  }

  isSubAdmin() {
    return this.role() === 'SUBADMIN';
  }
}
