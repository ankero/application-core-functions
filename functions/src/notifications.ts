import * as functions from "firebase-functions";
import { DATABASE } from "./constants";
import { Notification } from "./interfaces";
import {
  markAllNotificationsAsReadForUserId,
  populateNotificationReferenceUserProfiles,
} from "./services/notifications";

const isEqual = require("lodash.isequal");

export const onNotificationWrite = functions.firestore
  .document(DATABASE.notifications.documents.notification)
  .onWrite(async (change, context) => {
    try {
      const { entityId } = context.params;

      if (!change.after.exists) return;

      const notification = change.after.data() as Notification;
      const prevNotification = change.before.data() as Notification;

      if (!notification) return;

      const hasReferenceUserIdChanges =
        !prevNotification ||
        !isEqual(
          notification.referenceUserIds,
          prevNotification.referenceUserIds
        );

      if (!hasReferenceUserIdChanges) {
        return;
      }

      await populateNotificationReferenceUserProfiles(entityId, notification);
    } catch (error) {
      throw error;
    }
  });

export const markAllNotificationsRead = functions.https.onCall(
  async (data, context) => {
    try {
      const { uid } = context.auth || ({} as any);

      if (!uid) {
        throw new Error("UNAUTHORIZED");
      }

      await markAllNotificationsAsReadForUserId(uid);

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
);
