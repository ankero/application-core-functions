import * as admin from "firebase-admin";
import {
  ReplicationConfigurationItem,
  MembershipObject,
  EntityType,
} from "../interfaces";
import { getApplicationReplicationConfiguration } from "./application";
import { getCompositeId, isInMembers } from "./entityMemberHandlers";

// database
const db = admin.firestore();

function populateEntityId(entityId: string, item: string | number) {
  if (typeof item === "string") {
    return item.replace("{entityId}", entityId);
  }
  return item;
}

export async function deleteObjectReferences(
  entityId: string,
  collection: string,
  entityType: EntityType,
  membersToDelete: Array<string> = []
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

    const configurationSet = replicationConfiguration[collection];

    if (!configurationSet) {
      return;
    }

    const batch = db.batch();

    for (const conf of configurationSet) {
      const set = conf as ReplicationConfigurationItem;

      if (!set.deleteReferencesOnDelete) {
        continue;
      }

      const whereQuery = populateEntityId(entityId, set.source[0]) as string;
      const comparator = set.source[1];
      const filterBy = populateEntityId(entityId, set.source[2]);

      const snapshots = await db
        .collection(set.collection)
        .where(whereQuery, comparator, filterBy)
        .get();

      const entityMemberId =
        entityType === EntityType.GROUP ? getCompositeId(entityId) : entityId;

      snapshots.forEach((doc) => {
        const payload = {} as any;
        const docData = doc.data();
        const entityMembers = docData.members as MembershipObject;
        const entityPermissionLevel = entityMembers[entityMemberId];
        payload[
          `members.${entityMemberId}`
        ] = admin.firestore.FieldValue.delete();
        membersToDelete.forEach((memberId) => {
          if (
            isInMembers(entityMembers, memberId) &&
            entityMembers[memberId] === entityPermissionLevel
          ) {
            payload[
              `members.${memberId}`
            ] = admin.firestore.FieldValue.delete();
          }
        });
        batch.update(doc.ref, payload);
      });
    }

    await batch.commit();
  } catch (error) {
    throw error;
  }
}

export async function updateObjectReferences(
  entityId: string,
  data: any,
  collection: string,
  removedMembers?: Array<string>,
  addedMembers?: Array<string>
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

    const configurationSet = replicationConfiguration[collection];

    if (!configurationSet) {
      return;
    }

    const batch = db.batch();

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
        const docData = doc.data();
        const references = docData[set.targetKey];

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

        const payload = { [set.targetKey]: newReferences };

        if (
          set.inheritMembers &&
          removedMembers &&
          addedMembers &&
          (removedMembers.length > 0 || addedMembers.length > 0)
        ) {
          const entityMembers = docData.members as MembershipObject;
          const entityMemberRole = entityMembers[getCompositeId(entityId)];
          removedMembers.forEach((memberId: string) => {
            if (
              isInMembers(entityMembers, memberId) &&
              entityMembers[memberId] <= entityMemberRole
            ) {
              entityMembers[memberId] = admin.firestore.FieldValue.delete();
            }
          });
          addedMembers.forEach((memberId: string) => {
            if (!isInMembers(entityMembers, memberId)) {
              entityMembers[memberId] = entityMemberRole;
            } else if (
              isInMembers(entityMembers, memberId) &&
              entityMembers[memberId] < entityMemberRole
            ) {
              entityMembers[memberId] = entityMemberRole;
            }
          });
          payload.members = entityMembers;
        }

        batch.set(doc.ref, payload, { merge: true });
      });
    }

    await batch.commit();
  } catch (error) {
    throw error;
  }
}
