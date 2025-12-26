import { Injectable } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private db = getFirestore();
  private dateCache = new Map<string, any[]>();

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
    console.log(name, data);
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

  listenByDate(
    collectionName: string,
    date: string,
    callback: (data: any[]) => void
  ) {
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

}
