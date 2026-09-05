import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { FirestoreService } from '../service/firestore.service';
import { InvoiceService } from '../service/invoice-service';

export interface Expense {
  id: string;
  item: string;
  amount: number;
  purchaseDate: Date;
  status: 'Paid' | 'Due';
}

@Component({
  selector: 'app-add-expense',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatIcon,
    MatIconModule
  ],
  templateUrl: './add-expense.html',
  styleUrl: './add-expense.scss',
})
export class AddExpense {
  items = ['Noodles', 'Vegetables', 'Paneer', 'Chicken', 'Egg', 'Onion', 'Gas Cylinder', 'Oil', 'Raw Material', 'Water Bill', 'Others'];

  expenses = signal<Expense[]>([]);

  expenseForm!: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private invoiceService: InvoiceService, private fs: FirestoreService) {
    this.expenseForm = this.fb.group({
      item: [''],
      customItem: [''],
      amount: [null, [Validators.required, Validators.min(1)]],
      purchaseDate: [new Date(), Validators.required],
      status: ['Paid', Validators.required]
    }, {
      validators: (control: AbstractControl): ValidationErrors | null => {
        const item = control.get('item')?.value;
        const customItem = control.get('customItem')?.value;
        return item || customItem?.trim() ? null : { itemRequired: true };
      }
    });
  }

  addExpense() {
    if (this.expenseForm.invalid) return;
    const formValue = this.expenseForm.getRawValue();
    const item = formValue.customItem?.trim() || formValue.item;
    const expense: Expense = {
      id: this.invoiceService.generateBillNo('EXP'),
      item,
      amount: Number(formValue.amount),
      purchaseDate: formValue.purchaseDate,
      status: formValue.status
    };
    this.expenses.update(list => [...list, expense]);

    const html = `
    <div style="max-width: 500px; border: 2px solid mediumvioletred; border-radius: 10px; padding: 11px; color: #d33;">
      <h3>Added Expenses</h3>
        <div>
          <strong>${expense.item}</strong>
          - ₹${expense.amount}
          | ${expense.status}
          | ${new Date(expense.purchaseDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })}
        </div>
    </div>`;

    Swal.fire({
      html: html,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!"
    }).then((result) => {
      if (!result.isConfirmed) {
        this.resetForm();
        return;
      }
      this.saveExpense(expense);
    });
  }

  resetForm() {
    this.expenseForm.reset({
      item: '',
      customItem: '',
      amount: null,
      purchaseDate: new Date(),
      status: 'Paid'
    });
  }

  saveExpense(expense: Expense) {
    //this.invoiceService.getSetExpensesToLocalStorage(expense);
    this.fs.addWithId('expenses', expense.id, expense).then(() => {
      Swal.fire({
        title: "Saved!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false
      });
      this.resetForm();
    })
      .catch(err => {
        Swal.fire({
          title: "Try Again!",
          text: "Something went wrong",
          icon: "error",
          timer: 1000,
          showConfirmButton: false
        });
        this.resetForm();
      });
  }
}

