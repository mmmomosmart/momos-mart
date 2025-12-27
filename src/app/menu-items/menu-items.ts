import { Component, inject, Input } from '@angular/core';
import { momosList } from '../../menu-category/momos-list';
import { Product } from '../../menu-category/product-model';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { chineseList } from '../../menu-category/chinese-list';
import { noodlesList } from '../../menu-category/noodles-list';
import { riceList } from '../../menu-category/rice-list';
import { rollsList } from '../../menu-category/rolls-list';
import { combosList } from '../../menu-category/combos-list';
import { parathaList } from '../../menu-category/paratha-list';
import { CartService } from '../service/cart-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-menu-items',
  imports: [CommonModule, MatIcon, MatFormFieldModule, MatOptionModule, MatSelectModule],
  templateUrl: './menu-items.html',
  styleUrl: './menu-items.scss',
})
export class MenuItems {
  @Input() currentPath: string = '';

  private cartService = inject(CartService);

  constructor(private router: Router, private activatedRoute: ActivatedRoute) { }

  products: Product[] = [];
  header: string | null = null;
  showComingSoonText: boolean = false;
  comingSoonText: string = '';

  selectedOption:string = 'momos';

  options = [
    { label: 'Momos', value: 'momos' },
    { label: 'Chinese', value: 'chinese' },
    { label: 'Noodles', value: 'noodles' },
    { label: 'Rice', value: 'rice' },
    { label: 'Rolls', value: 'rolls' },
    { label: 'Combos', value: 'combos' },
    { label: 'Paratha', value: 'paratha' }
  ];

  ngOnInit() {
    const category = this.activatedRoute.snapshot.paramMap.get('category') ?? '';
    this.header = category
      ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
      : '';
    this.selectedOption = category?.toLowerCase();
    this.getCategoryList(category);

    // Sync existing quantities from cart to products
    this.cartService.cart$.subscribe(cart => {
      this.products?.forEach(p => {
        const match = cart.find(
          item => item.name === p.name && item.portion === p.portion
        );
        p.quantity = match?.quantity ?? 0;
      });
    });
  }

  onCategoryChange(category: string) {
    this.header = category
      ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
      : '';
    this.getCategoryList(category);
}

  getCategoryList(category: any) {
    const categoryMap: any = {
      momos: momosList,
      chinese: chineseList,
      noodles: noodlesList,
      rice: riceList,
      rolls: rollsList,
      combos: combosList,
      paratha: parathaList
    };

    if (category == 'others' || category == 'indian') {
      this.showComingSoonText = true;
      this.comingSoonText = '...' + 'Coming Soon' + '...';
    }

    this.products = categoryMap[category];

  }

  goToHome() {
    this.router.navigate(['/']);
  }

  // Add product (+ button)
  add(product: Product) {
    this.cartService.addProduct(product);
  }

  // Remove one (- button)  
  remove(product: Product) {
    if (product.quantity && product.quantity > 0) {
      this.cartService.removeOne(product);
    }
  }

  // Get qty to show in UI  
  getQty(product: Product): number {
    return product.quantity ?? 0;
  }
}
