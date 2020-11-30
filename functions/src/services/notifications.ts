import * as admin from "firebase-admin";

import { DATABASE } from "../constants";
import { EntityType, Notification } from "../interfaces";
import { listUserPublicProfiles } from "./user";

// database
const db = admin.firestore();

export async function createOrUpdateNotification(
  notificationId: string | null,
  notification: Notification | any
): Promise<void> {
  try {
    if (notificationId) {
      await db
        .doc(
          DATABASE.notifications.documents.notification.replace(
            "{entityId}",
            notificationId
          )
        )
        .set(notification, { merge: true });
    } else {
      await db
        .collection(DATABASE.notifications.collectionName)
        .add({ ...notification, createdMillis: Date.now() });
    }
  } catch (error) {
    throw error;
  }
}

export async function listNotificationsByReferenceEntityIdAndType(
  entityId: string,
  entityType: EntityType
): Promise<Array<Notification>> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.notifications.collectionName)
      .where("referenceEntityId", "==", entityId)
      .where("referenceEntityType", "==", entityType)
      .get();

    if (querySnapshot.empty) {
      return [];
    }

    const result = [] as Array<Notification>;

    querySnapshot.forEach((snapshot) =>
      result.push({
        ...snapshot.data(),
        id: snapshot.id,
      } as Notification)
    );

    return result;
  } catch (error) {
    throw error;
  }
}

export async function populateNotificationReferenceUserProfiles(
  notificationId: string,
  notification: Notification
): Promise<void> {
  try {
    const profiles = await listUserPublicProfiles(
      notification.referenceUserIds
    );

    await createOrUpdateNotification(notificationId, {
      referenceUserProfiles: profiles.filter((profile) => profile),
    });
  } catch (error) {
    throw error;
  }
}
