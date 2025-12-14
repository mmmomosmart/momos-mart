import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../../menu-category/product-model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartSource = new BehaviorSubject<Product[]>([]);
  cart$ = this.cartSource.asObservable();

  constructor() { }

  // ---------------------------
  // Add product (+ button)
  // ---------------------------
  addProduct(product: Product) {
    const cart = this.cartSource.value;

    const existing = cart.find(item =>
      item.name === product.name && item.portion === product.portion
    );

    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + 1;
      existing.total = existing.quantity * existing.price;
      this.cartSource.next([...cart]);
    } else {
      const newProduct = {
        ...product,
        quantity: 1,
        total: product.price
      };
      this.cartSource.next([...cart, newProduct]);
    }
  }

  // ---------------------------
  // Remove one (- button)
  // ---------------------------
  removeOne(product: Product) {
    const cart = [...this.cartSource.value];

    const index = cart.findIndex(
      item => item.name === product.name && item.portion === product.portion
    );

    if (index !== -1) {
      const item = cart[index];

      if (item.quantity && item.quantity > 1) {
        item.quantity -= 1;
        item.total = item.quantity * item.price;
      } else {
        cart.splice(index, 1);   // remove product if qty becomes 0
      }
    }

    this.cartSource.next(cart);
  }

  //remove when cliskedon delete button
  removeItem(product: Product) {    
    const updated = this.cartSource.value.filter(i =>
      !(i.name === product.name && i.portion === product.portion)
    );
    this.cartSource.next(updated);
  }

  // ---------------------------
  // NEW: Update to a specific quantity
  // ---------------------------
  updateQuantity(product: Product, qty: number) {
    if (qty <= 0) {
      this.removeOne({ ...product, quantity: 1 });
      return;
    }

    const cart = this.cartSource.value;

    const existing = cart.find(item =>
      item.name === product.name && item.portion === product.portion
    );

    if (existing) {
      existing.quantity = qty;
      existing.total = existing.quantity * existing.price;
      this.cartSource.next([...cart]);
    } else {
      const newProduct = {
        ...product,
        quantity: qty,
        total: qty * product.price
      };
      this.cartSource.next([...cart, newProduct]);
    }
  }

  // ---------------------------
  // Clear all
  // ---------------------------
  clearCart() {
    this.cartSource.next([]);
  }

  // ---------------------------
  // Total price
  // ---------------------------
  getTotal(): number {
    return this.cartSource.value.reduce((sum, item) => {
      return sum + (item.total ?? item.price);
    }, 0);
  }

  // ---------------------------
  // Get total cart items (for footer badge)
  // ---------------------------
  getItemCount(): number {
    return this.cartSource.value.reduce((sum, item) => {
      return sum + (item.quantity ?? 0);
    }, 0);
  }
}
