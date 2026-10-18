import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { InterventionEvent } from '../components/InterventionsPlanningView';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitizes an InterventionEvent to make sure no undefined properties are passed to Firestore.
 */
function sanitizeInterventionPayload(intervention: InterventionEvent) {
  const allowedStatuses = ['planned', 'in_progress', 'completed', 'urgent', 'cancelled'];
  const status = allowedStatuses.includes(intervention.status) ? intervention.status : 'planned';

  const payload: Record<string, any> = {
    id: intervention.id,
    title: (intervention.title || 'Intervention Technique').slice(0, 200),
    buildingId: (intervention.buildingId || 'BAT-01').slice(0, 100),
    buildingName: (intervention.buildingName || 'Bâtiment 1').slice(0, 200),
    location: (intervention.location || 'Local Technique').slice(0, 200),
    date: intervention.date || new Date().toISOString().split('T')[0],
    startHour: Number(intervention.startHour ?? 9),
    endHour: Number(intervention.endHour ?? 10.5),
    startTimeStr: (intervention.startTimeStr || '09:00').slice(0, 20),
    endTimeStr: (intervention.endTimeStr || '10:30').slice(0, 20),
    category: (intervention.category || 'cvc').slice(0, 50),
    technicianIds: Array.isArray(intervention.technicianIds) ? intervention.technicianIds.slice(0, 30) : ['tech-1'],
    status,
    source: intervention.source || 'local',
    updatedAt: new Date().toISOString(),
  };

  if (intervention.notes !== undefined && intervention.notes !== null) {
    payload.notes = String(intervention.notes).slice(0, 1000);
  }
  if (intervention.priority !== undefined && intervention.priority !== null) {
    payload.priority = intervention.priority;
  }
  if (intervention.rsvpStatus !== undefined && intervention.rsvpStatus !== null) {
    payload.rsvpStatus = intervention.rsvpStatus;
  }
  if (intervention.sheetRowIndex !== undefined && intervention.sheetRowIndex !== null) {
    payload.sheetRowIndex = intervention.sheetRowIndex;
  }

  return payload;
}

/**
 * Updates or creates an intervention in the Firestore 'planning' collection.
 * Ensures persistent synchronization with the main cloud database.
 */
export async function updateFirestorePlanningIntervention(intervention: InterventionEvent): Promise<void> {
  if (!intervention || !intervention.id) {
    console.warn('Cannot update Firestore planning: missing intervention ID');
    return;
  }

  const docPath = `planning/${intervention.id}`;
  try {
    const docRef = doc(db, 'planning', intervention.id);
    const payload = sanitizeInterventionPayload(intervention);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Deletes an intervention from the Firestore 'planning' collection.
 */
export async function deleteFirestorePlanningIntervention(interventionId: string): Promise<void> {
  if (!interventionId) return;

  const docPath = `planning/${interventionId}`;
  try {
    const docRef = doc(db, 'planning', interventionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Real-time listener for the Firestore 'planning' collection.
 * Returns an unsubscribe function.
 */
export function subscribeFirestorePlanning(
  onData: (events: InterventionEvent[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const collectionPath = 'planning';
  const colRef = collection(db, collectionPath);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: InterventionEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title || 'Intervention',
          buildingId: data.buildingId || 'BAT-01',
          buildingName: data.buildingName || 'Bâtiment 1',
          location: data.location || 'Local Technique',
          date: data.date,
          startHour: typeof data.startHour === 'number' ? data.startHour : 9,
          endHour: typeof data.endHour === 'number' ? data.endHour : 10.5,
          startTimeStr: data.startTimeStr || '09:00',
          endTimeStr: data.endTimeStr || '10:30',
          category: data.category || 'cvc',
          technicianIds: Array.isArray(data.technicianIds) ? data.technicianIds : ['tech-1'],
          status: data.status || 'planned',
          notes: data.notes,
          priority: data.priority,
          rsvpStatus: data.rsvpStatus,
          source: data.source || 'local',
          sheetRowIndex: data.sheetRowIndex
        });
      });
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, collectionPath);
    }
  );

  return unsubscribe;
}

/**
 * Syncs multiple interventions to the Firestore 'planning' collection.
 */
export async function syncBatchToFirestorePlanning(interventions: InterventionEvent[]): Promise<void> {
  if (!interventions || interventions.length === 0) return;

  try {
    for (const item of interventions) {
      await updateFirestorePlanningIntervention(item);
    }
  } catch (err) {
    console.error('Error during batch sync to Firestore planning:', err);
  }
}

/**
 * Synchronizes interventions from Google Sheets with Firestore.
 * - Saves new / updated Google Sheets events into Firestore.
 * - Deletes orphaned Google Sheets events from Firestore that are no longer in the spreadsheet.
 * - Preserves manually created local events.
 */
export async function syncGoogleSheetsWithFirestore(sheetEvents: InterventionEvent[]): Promise<{ addedOrUpdated: number; deleted: number }> {
  try {
    const colRef = collection(db, 'planning');
    const snapshot = await getDocs(colRef);
    const existingSheetIds = new Set<string>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.source === 'google_sheets' || docSnap.id.startsWith('gs-ev-')) {
        existingSheetIds.add(docSnap.id);
      }
    });

    const newSheetIds = new Set(sheetEvents.map(e => e.id));
    let deletedCount = 0;

    // Delete events that were removed from Google Sheets
    for (const oldId of existingSheetIds) {
      if (!newSheetIds.has(oldId)) {
        try {
          await deleteDoc(doc(db, 'planning', oldId));
          deletedCount++;
        } catch (delErr) {
          console.warn(`Could not delete orphaned Google Sheets event ${oldId}:`, delErr);
        }
      }
    }

    // Save or update all incoming Google Sheets events
    let writeCount = 0;
    for (const item of sheetEvents) {
      try {
        const itemToSave: InterventionEvent = {
          ...item,
          source: 'google_sheets'
        };
        await updateFirestorePlanningIntervention(itemToSave);
        writeCount++;
      } catch (saveErr) {
        console.warn(`Could not save Google Sheets event ${item.id} to Firestore:`, saveErr);
      }
    }

    return { addedOrUpdated: writeCount, deleted: deletedCount };
  } catch (error) {
    console.error('Error during syncGoogleSheetsWithFirestore:', error);
    return { addedOrUpdated: 0, deleted: 0 };
  }
}
