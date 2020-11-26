import * as functions from "firebase-functions";

import { DATABASE } from "./constants";
import { createAuditLogEvent } from "./services/auditLog";
import { getApplicationUserConfiguration } from "./services/application";
import {
  buildUserPublicProfile,
  createOrUpdateProfile,
  createOrUpdateProfilePublicData,
  deleteProfile,
  getRandomName,
  getRandomAvatar,
} from "./services/user";
import { deleteUserBucket } from "./services/storage";
import { claimInvitesForUser } from "./services/invites";
import { AuditLogEvents } from "./interfaces";

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  await createOrUpdateProfile(user.uid, {
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    publicName: getRandomName(),
    publicPhotoUrl: getRandomAvatar(user.uid),
    photoURL: user.photoURL,
    createdAtMillis: Date.now(),
  });
  await claimInvitesForUser(user);
  await createAuditLogEvent({
    event: AuditLogEvents.USER_ACCOUNT_CREATED,
    entityId: user.uid,
  });
});

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    await deleteProfile(user.uid);

    await deleteUserBucket(user.uid);

    await createAuditLogEvent({
      event: AuditLogEvents.USER_ACCOUNT_DELETED,
      entityId: user.uid,
    });
  } catch (error) {
    throw error;
  }
});

export const onUserUpdate = functions.firestore
  .document(DATABASE.users.documents.user)
  .onUpdate(async (change, context) => {
    try {
      // Get userId
      const { entityId } = context.params;

      // Get document
      const document = change.after.exists ? change.after.data() : {};

      // Get user profile settings
      const profileSettings = await getApplicationUserConfiguration();

      // Set public profile based on profile settings
      if (profileSettings && profileSettings.userFields) {
        const publicProfile = buildUserPublicProfile(
          { ...document, id: entityId },
          profileSettings
        );
        await createOrUpdateProfilePublicData(entityId, publicProfile);
      }

      // Set audit log record if this is not a new user as the new user
      // event is recorded with the user listener.
      if (change.before.exists) {
        await createAuditLogEvent({
          event: AuditLogEvents.USER_PROFILE_UPDATED,
          entityId,
        });
      }
    } catch (error) {
      throw Error(error);
    }
  });
