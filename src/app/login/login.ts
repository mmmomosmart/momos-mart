import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import Swal, { SweetAlertIcon } from 'sweetalert2';
import { AuthService } from '../service/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  constructor(private router: Router) { }
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  hidePassword = signal(true);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  togglePassword() {
    this.hidePassword.update(v => !v);
  }

  login() {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;

    // TODO: Replace with API authentication
    console.log('Login clicked', { username, password });

    if (username?.toLowerCase() === 'admin' && password === 'admin789') {
      this.auth.loginAsAdmin();
      this.showDialog("success", "Login Successful !", "Logged in as Admin.");
    }
    else if (username?.toLowerCase() === 'umesh' && password === 'umesh987') {
      this.auth.loginAsSubAdmin();
      this.showDialog("success", "Login Successful !", "Logged in as SubAdmin.");
    }
    else {
      this.showDialog("error", "Login Failed !", "Invalid Username or Password.");
    }
  }

  showDialog(icon: SweetAlertIcon, title: string, text: string) {
    
    if (icon != 'error') {
      if(this.auth.isAdmin()) this.router.navigateByUrl('/admin/reports');
      if(this.auth.isSubAdmin()) this.router.navigateByUrl('/admin/add-expense');
    }

    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      timer: 1500,
      showConfirmButton: false
    });
  }
}
