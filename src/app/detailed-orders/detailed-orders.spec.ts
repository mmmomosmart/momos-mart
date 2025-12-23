import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailedOrders } from './detailed-orders';

describe('DetailedOrders', () => {
  let component: DetailedOrders;
  let fixture: ComponentFixture<DetailedOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailedOrders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailedOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
