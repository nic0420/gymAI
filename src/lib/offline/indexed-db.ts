/**
 * Gestor de Base de Datos Local IndexedDB para Contingencia Offline-First
 * Permite que la recepción continúe operando si se cae la conexión a Internet.
 */

export interface OfflineMember {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  status: string;
  photoUrl?: string | null;
  subscriptionStatus: string;
  subscriptionEndDate: string;
  medicalStatus: string;
  medicalExpiryDate?: string | null;
}

export interface OfflinePendingAttendance {
  clientEventId: string;
  tenantId: string;
  branchId: string;
  dni: string;
  accessStatus: "GRANTED_GREEN" | "WARNING_YELLOW" | "DENIED_RED";
  accessMethod: "DNI_KEYPAD" | "BARCODE_SCAN" | "QR_MOBILE" | "BIOMETRIC_FINGERPRINT" | "FACIAL_RECOGNITION" | "MANUAL_RECEPTION";
  warningReason?: string;
  denialReason?: string;
  checkInAt: string;
  synced: boolean;
}

const DB_NAME = "GymAI_Offline_Storage";
const DB_VERSION = 1;

export class OfflineStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("IndexedDB solo está disponible en el navegador"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          // Almacén de padrón de socios
          if (!db.objectStoreNames.contains("members")) {
            const memberStore = db.createObjectStore("members", { keyPath: "dni" });
            memberStore.createIndex("status", "status", { unique: false });
          }
          // Almacén de asistencias pendientes de sincronización
          if (!db.objectStoreNames.contains("pending_attendances")) {
            const attStore = db.createObjectStore("pending_attendances", {
              keyPath: "clientEventId",
            });
            attStore.createIndex("synced", "synced", { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  /**
   * Guarda o actualiza el padrón de socios en caché local
   */
  public async cacheMembers(members: OfflineMember[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("members", "readwrite");
    const store = tx.objectStore("members");

    for (const member of members) {
      store.put(member);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Busca un socio en la base de datos local por DNI
   */
  public async getMemberByDni(dni: string): Promise<OfflineMember | null> {
    const db = await this.getDB();
    const tx = db.transaction("members", "readonly");
    const store = tx.objectStore("members");
    const request = store.get(dni.trim());

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Registra una asistencia pendiente en cola local offline
   */
  public async queuePendingAttendance(attendance: OfflinePendingAttendance): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("pending_attendances", "readwrite");
    const store = tx.objectStore("pending_attendances");
    store.put(attendance);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Obtiene todas las asistencias pendientes de sincronizar
   */
  public async getUnsyncedAttendances(): Promise<OfflinePendingAttendance[]> {
    const db = await this.getDB();
    const tx = db.transaction("pending_attendances", "readonly");
    const store = tx.objectStore("pending_attendances");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const list = (request.result as OfflinePendingAttendance[]) || [];
        resolve(list.filter((item) => !item.synced));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Marca asistencias como sincronizadas o las elimina
   */
  public async clearSyncedAttendances(eventIds: string[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction("pending_attendances", "readwrite");
    const store = tx.objectStore("pending_attendances");

    for (const id of eventIds) {
      store.delete(id);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineStorage = new OfflineStorageManager();
