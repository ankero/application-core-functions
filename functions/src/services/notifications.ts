import * as admin from "firebase-admin";

import { DATABASE } from "../constants";
import { EntityType, Notification, NotificationEventType } from "../interfaces";
import { sendNotificationToUserDevices } from "./messaging";
import { listUserPublicProfiles } from "./user";

// database
const db = admin.firestore();

function getNotificationUriRoot(entityType: EntityType) {
  switch (entityType) {
    case EntityType.GROUP:
      return "/groups";
    case EntityType.PROJECT:
      return "/projects";
    case EntityType.INTIVE:
      return "/invites";
    default:
      return "/home";
  }
}

export function getNotificationUri(
  type: NotificationEventType,
  entityId: string | null | undefined,
  entityType: EntityType
) {
  if (!entityId) {
    console.warn(`Missing entityId in getNotificationUri for type: ${type}`);
    return `/home`;
  }

  const uriRoot = getNotificationUriRoot(entityType);

  switch (type) {
    case NotificationEventType.INVITATION_RECEIVED:
      return `/invites/${entityId}`;
    case NotificationEventType.INVITE_ACCEPTED:
      return `${uriRoot}/${entityId}`;
    case NotificationEventType.INVITE_REJECTED:
      return `${uriRoot}/${entityId}`;

    default:
      console.warn(
        `Unhandled notificationEventType in getNotificationUri: ${type}`
      );
      return `/home`;
  }
}

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
      await sendNotificationToUserDevices(notification);
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

export async function markAllNotificationsAsReadForUserId(
  userId: string
): Promise<void> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.notifications.collectionName)
      .where("userId", "==", userId)
      .get();

    if (querySnapshot.empty) {
      return;
    }

    const batch = db.batch();

    querySnapshot.forEach((snapshot) => {
      if (snapshot.data().read) return;
      batch.set(
        snapshot.ref,
        {
          seen: true,
          read: true,
          seenMillis: Date.now(),
          readMillis: Date.now(),
          readByReadAll: true,
        },
        { merge: true }
      );
    });

    await batch.commit();
  } catch (error) {
    throw error;
  }
}
