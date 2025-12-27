import { Injectable, signal } from '@angular/core';
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
  orderBy
} from 'firebase/firestore';
import { Expense } from '../expense-list/expense-list';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private db = getFirestore();
  private dateCache = new Map<string, any[]>();

  private _expenses = signal<any[]>([]);
  readonly expenses$ = this._expenses.asReadonly();

  private expensesUnsub: (() => void) | null = null;


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
    console.log("order");
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

  getExpensesRealtime(callback: (data: any[]) => void) {
    console.log("called");
    const q = collection(this.db, 'expenses');
    return onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(d => d.data());
      callback(data);
    });
  }

  startExpensesListener() {
    console.log("start")
    if (this.expensesUnsub) return; // already listening

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
