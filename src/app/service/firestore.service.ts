import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  getFirestore,
  collection,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  WithFieldValue,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { Expense } from '../expense-list/expense-list';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private db = getFirestore();
  private dateCache = new Map<string, any[]>();

  private _expenses = signal<any[]>([]);
  readonly expenses$ = this._expenses.asReadonly();
  private expensesUnsub: (() => void) | null = null;

  private _invoicesByDate = signal<any[]>([]);
  readonly invoicesByDate$ = this._invoicesByDate.asReadonly();
  private invoicesByDateUnsub: (() => void) | null = null;

  private http = inject(HttpClient);


  //Order Section
  private getCacheKey(collection: string, date: string) {
    return `${collection}_${date}`;
  }

  async getByDateCached<T>(collectionName: string, date: string): Promise<T[]> {
    const cacheKey = this.getCacheKey(collectionName, date);

    //Serve from cache
    if (this.dateCache.has(cacheKey)) {
      console.log('Serving from cache');
      return this.dateCache.get(cacheKey)! as T[];
    }

    //Fetch from Firestore
    console.log('Fetching from Firestore');
    const snap = await this.getByDate(collectionName, date);
    const data = snap.docs.map(d => d.data() as T);

    //Save to cache
    this.dateCache.set(cacheKey, data);

    return data;
  }

  clearDateCache(collectionName?: string, date?: string) {
    if (collectionName && date) {
      this.dateCache.delete(this.getCacheKey(collectionName, date));
      return;
    }

    // Clear everything (safe fallback)
    this.dateCache.clear();
  }

  getCollection<T>(name: string): Promise<T[]> {
    return getDocs(collection(this.db, name)).then(snapshot =>
      snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as T)
    );
  }

  add<T>(name: string, data: T) {
    return addDoc(collection(this.db, name), data as any);
  }

  update(name: string, id: string, data: Partial<any>) {
    return updateDoc(doc(this.db, name, id), data);
  }

  delete(name: string, id: string) {
    return deleteDoc(doc(this.db, name, id));
  }

  initializeMonthlySales(year: number, month: number) {
    // month: 1 = January, 2 = February, ..., 12 = December

    const batch = writeBatch(this.db);

    const current = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);

      const docId =
        `${day} ${date.toLocaleString('en-US', { month: 'long' })} ${year}`;

      const docRef = doc(collection(this.db, 'TotalSales'), docId);

      batch.set(docRef, {
        total: 0
      });
    }

    batch.commit();

    console.log('Monthly sales initialized successfully.');
  }

  async getTotalSalesViaMock(): Promise<any[]> {
    const data = await firstValueFrom(
      this.http.get<any[]>('assets/mock.json')
    );
    console.log('Mock sales data:', data);
    return data;
  }
  
  async getTotalSales(): Promise<any[]> {
    return await this.getCollection<any>('TotalSales');
  }

  async getMonthlySalesViaSnapshot(year: number, month: number): Promise<number> {
    const snapshot = await getDocs(collection(this.db, 'TotalSales'));
    let monthlyTotal = 0;
    const monthName = new Date(year, month - 1).toLocaleString('en-US', {
      month: 'long'
    });
    snapshot.forEach(doc => {
      if (doc.id.endsWith(`${monthName} ${year}`)) {
        monthlyTotal += doc.data()['total'] || 0;
      }
    });
    return monthlyTotal;
  }

  async getMonthlySales(year: number, month: number): Promise<number> {
    const sales = await this.getCollection<any>('TotalSales');
    const monthName = new Date(year, month - 1).toLocaleString('en-US', {
      month: 'long'
    });
    return sales
      .filter(s => s.id.endsWith(`${monthName} ${year}`))
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }

  async getSalesByDate(date: Date): Promise<number> {
    const docId =
      `${date.getDate()} ${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
    const docRef = doc(this.db, 'TotalSales', docId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data()['total'] || 0;
    }
    return 0;
  }

  addWithId<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: WithFieldValue<T>
  ) {
    const ref = doc(this.db, collectionName, docId);
    return setDoc(ref, data);
  }

  getById<T = DocumentData>(collectionName: string, docId: string) {
    return getDoc(doc(this.db, collectionName, docId));
  }

  getByDate(collectionName: string, date: string) {
    const q = query(
      collection(this.db, collectionName),
      where('createdOn.date', '==', date),
      orderBy('createdOn.time', 'desc')
    );
    return getDocs(q);
  }

  deleteWithId(collectionName: string, docId: string) {
    return deleteDoc(doc(this.db, collectionName, docId));
  }

  listenByDate(collectionName: string, date: string, callback: (data: any[]) => void) {
    console.log("Invoices db called");
    const q = query(
      collection(this.db, collectionName),
      where('createdOn.date', '==', date),
      orderBy('createdOn.time', 'desc')
    );

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(d => d.data());
      callback(data);
    });
  }

  async getInvoicesByRange(
    start: Date,
    end: Date
  ): Promise<any[]> {

    const q = query(
      collection(this.db, 'invoices'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );

    const snap = await getDocs(q);

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  }

  startInvoicesByDateListener(date: string) {
    if (this.invoicesByDateUnsub) return;
    console.log("startInvoicesByDateListener");
    const q = query(
      collection(this.db, 'invoices'),
      where('createdOn.date', '==', date)
    );

    this.invoicesByDateUnsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => d.data()).reverse();
      console.log(data)
      this._invoicesByDate.set(data);
    });
  }

  stopInvoicesByDateListener() {
    this.invoicesByDateUnsub?.();
    this.invoicesByDateUnsub = null;
  }

  startExpensesListener() {
    if (this.expensesUnsub) return; // already listening

    console.log("Expenses db called")

    const q = collection(this.db, 'expenses');

    this.expensesUnsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => {
        const e = d.data() as any;

        return {
          ...e,
          purchaseDate: e['purchaseDate']?.toDate
            ? e['purchaseDate'].toDate()
            : new Date(e['purchaseDate'])
        };
      });
      this._expenses.set(data);
    });
  }

  stopExpensesListener() {
    this.expensesUnsub?.();
    this.expensesUnsub = null;
  }
}
