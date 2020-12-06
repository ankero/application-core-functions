import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import { EntityType, Notification, NotificationEventType } from "../interfaces";
const db = admin.firestore();

async function getDevicesForUser(userId: string): Promise<any> {
  try {
    const querySnapshot = await db
      .collection(
        DATABASE.users.collections.userDevices.collectionName.replace(
          "{entityId}",
          userId
        )
      )
      .get();
    if (querySnapshot.empty) {
      console.log(`No devices for user: ${userId}`);
      return;
    }

    const devices = [] as any;
    querySnapshot.forEach((snapshot: FirebaseFirestore.DocumentData) =>
      devices.push({ ...snapshot.data(), id: snapshot.id })
    );

    return devices.filter((device: any) => device.token);
  } catch (error) {
    throw error;
  }
}

export async function sendMessageToUserDevices(
  userId: string,
  notification: admin.messaging.NotificationMessagePayload,
  data: admin.messaging.DataMessagePayload
): Promise<undefined | admin.messaging.BatchResponse> {
  try {
    const devices = await getDevicesForUser(userId);
    if (devices.length === 0) {
      return;
    }

    if (!data.uri) {
      console.warn(`Missing data.uri for messaging, defaulting to /home`);
    }

    const deviceTokens = devices.map((device: any) => device.token);
    // Don't include notification in the message as we want to handle
    // all notifications manually in the device. This also removes the
    // duplication of notificaitons on different devices.
    const message = {
      tokens: deviceTokens,
      data,
      webpush: {
        fcmOptions: {
          link: data.uri || "/home",
        },
      },
    } as admin.messaging.MulticastMessage;

    return await admin.messaging().sendMulticast(message);
  } catch (error) {
    throw error;
  }
}

function getNotificationReferenceEntityLiteral(
  notification: Notification
): string {
  switch (notification.referenceEntityType) {
    case EntityType.GROUP:
      return "group";
    case EntityType.PROJECT:
      return "project";
    case EntityType.INTIVE:
      return "invite";
    default:
      return "place";
  }
}

function getNotificationMessage(notification: Notification): any {
  const entityLiteral = getNotificationReferenceEntityLiteral(notification);
  switch (notification.eventType) {
    case NotificationEventType.INVITATION_RECEIVED:
      return {
        title: `New invitation`,
        body: `You've been invited to join ${entityLiteral}: ${notification.referenceEntityPreview.name}`,
      };
    case NotificationEventType.INVITE_ACCEPTED:
      return {
        title: `Invite accepted`,
        body: `Invitation accepted to ${entityLiteral}: ${notification.referenceEntityPreview.name}`,
      };
    case NotificationEventType.INVITE_REJECTED:
      return {
        title: `Invite rejected`,
        body: `Invitation rejected to ${entityLiteral}: ${notification.referenceEntityPreview.name}`,
      };

    default:
      console.warn(
        `Unhandled notificationEventType in getNotificationTitle: ${notification.eventType}`
      );
      return {
        title: `New notification`,
      };
  }
}

export async function sendNotificationToUserDevices(
  notification: Notification
) {
  const tag =
    `${notification.eventType}_${notification.uri}` || "notification_/home";
  return sendMessageToUserDevices(
    notification.userId,
    { ...getNotificationMessage(notification) },
    {
      ...getNotificationMessage(notification),
      tag,
      eventType: notification.eventType,
      uri: notification.uri,
    }
  );
}
