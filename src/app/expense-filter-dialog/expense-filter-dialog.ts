import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';


@Component({
  selector: 'app-expense-filter-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogActions,
    MatDialogContent,
    MatDividerModule
  ],
  templateUrl: './expense-filter-dialog.html',
})
export class ExpenseFilterDialog {
  dialogRef = inject(MatDialogRef<ExpenseFilterDialog>);
  data = inject(MAT_DIALOG_DATA);

  form: FormGroup = this.data.form;
  items = this.data.items;
  setToday = this.data.setToday;
  setThisWeek = this.data.setThisWeek;
  setThisMonth = this.data.setThisMonth;

  apply() {
    this.dialogRef.close();
  }

  clear() {
    this.data.clear();
    this.dialogRef.close();
  }


}
