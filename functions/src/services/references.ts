import * as admin from "firebase-admin";
import { ReplicationConfigurationItem } from "../interfaces";
import { getApplicationReplicationConfiguration } from "./application";

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
  collection: string
): Promise<void> {
  try {
    // Need to set the type to "any" as reference to object[key] does not work otherwise
    const replicationConfiguration = (await getApplicationReplicationConfiguration()) as any;

    if (
      !collection ||
      !replicationConfiguration ||
      !replicationConfiguration.hasOwnProperty(collection)
    ) {
      return;
    }

    const batch = db.batch();
    const configurationSet = replicationConfiguration[collection];

    if (!configurationSet) {
      return;
    }

    for (const conf of configurationSet) {
      const set = conf as ReplicationConfigurationItem;
      const whereQuery = populateEntityId(entityId, set.source[0]) as string;
      const comparator = set.source[1];
      const filterBy = populateEntityId(entityId, set.source[2]);

      const snapshots = await db
        .collection(set.collection)
        .where(whereQuery, comparator, filterBy)
        .get();

      snapshots.forEach((doc) => {
        const references = doc.data()[set.targetKey];
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

        batch.set(doc.ref, { [set.targetKey]: newReferences }, { merge: true });
      });
    }

    await batch.commit();
  } catch (error) {
    throw error;
  }
}
