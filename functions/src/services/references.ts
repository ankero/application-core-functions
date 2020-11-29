import * as admin from "firebase-admin";
import { ReferenceMap } from "../interfaces";

// database
const db = admin.firestore();

function populateEntityId(entityId: string, item: string | number) {
  if (typeof item === "string") {
    return item.replace("{entityId}", entityId);
  }
  return item;
}

export async function updateObjectReferences(
  entityId: string,
  data: any,
  referenceMap: Array<ReferenceMap>
): Promise<void> {
  try {
    if (!referenceMap || referenceMap.length === 0) {
      return;
    }

    const batch = db.batch();

    for (const conf of referenceMap) {
      const whereQuery = populateEntityId(entityId, conf.source[0]) as string;
      const comparator = conf.source[1] as any;
      const filterBy = populateEntityId(entityId, conf.source[2]);

      const snapshots = await db
        .collection(conf.collection)
        .where(whereQuery, comparator, filterBy)
        .get();

      snapshots.forEach((doc) => {
        const references = doc.data()[conf.targetKey];
        let newReferences;
        if (Array.isArray(references)) {
          newReferences = references.map((item: any) => {
            if (item.id !== entityId) {
              return item;
            }
            return {
              ...item,
              ...data,
            };
          });
        } else {
          newReferences = {
            ...references,
            ...data,
          };
        }

        batch.set(
          doc.ref,
          { [conf.targetKey]: newReferences },
          { merge: true }
        );
      });
    }

    await batch.commit();
  } catch (error) {
    throw error;
  }
}
