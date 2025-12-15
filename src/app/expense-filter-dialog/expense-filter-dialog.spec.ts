import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseFilterDialog } from './expense-filter-dialog';

describe('ExpenseFilterDialog', () => {
  let component: ExpenseFilterDialog;
  let fixture: ComponentFixture<ExpenseFilterDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseFilterDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseFilterDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
