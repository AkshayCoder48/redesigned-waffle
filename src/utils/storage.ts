/**
 * IndexedDB wrapper for file persistence
 */

const DB_NAME = 'ai-maos-fs';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface FileRecord {
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  createdAt: number;
  updatedAt: number;
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async writeFile(path: string, name: string, content: string): Promise<void> {
    if (!this.db) await this.init();

    const record: FileRecord = {
      path,
      name,
      type: 'file',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async readFile(path: string): Promise<FileRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async listFiles(path: string): Promise<FileRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('name');
      const request = index.openCursor();

      const results: FileRecord[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value as FileRecord;
          // Filter by parent path
          const parentPath = path === '/' ? '' : path;
          const recordParentPath = record.path.substring(0, record.path.lastIndexOf('/')) || '/';
          
          if (recordParentPath === parentPath || (parentPath === '' && recordParentPath === '/')) {
            results.push(record);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(path);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const storage = new IndexedDBStorage();
