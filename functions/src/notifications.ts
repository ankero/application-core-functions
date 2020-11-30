import * as functions from "firebase-functions";
import { DATABASE } from "./constants";
import { Notification } from "./interfaces";
import { populateNotificationReferenceUserProfiles } from "./services/notifications";

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
