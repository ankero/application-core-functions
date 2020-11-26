import * as functions from "firebase-functions";

import { AUDIT_LOG_EVENTS, DATABASE_ADDRESSES } from "./constants";
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

export const userCreationListener = functions.auth
  .user()
  .onCreate(async (user) => {
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
      event: AUDIT_LOG_EVENTS.USER_ACCOUNT_CREATED,
      userId: user.uid,
    });
  });

export const userDeletionListener = functions.auth
  .user()
  .onDelete(async (user) => {
    try {
      await deleteProfile(user.uid);

      await deleteUserBucket(user.uid);

      await createAuditLogEvent({
        event: AUDIT_LOG_EVENTS.USER_ACCOUNT_DELETED,
        userId: user.uid,
      });
    } catch (error) {
      throw error;
    }
  });

export const userProfileListener = functions.firestore
  .document(DATABASE_ADDRESSES.user)
  .onWrite(async (change, context) => {
    try {
      // Get userId
      const { userId } = context.params;

      // Get document
      const document = change.after.exists ? change.after.data() : {};

      // Get user profile settings
      const profileSettings = await getApplicationUserConfiguration();

      // Set public profile based on profile settings
      if (profileSettings && profileSettings.userFields) {
        const publicProfile = buildUserPublicProfile(
          { ...document, id: userId },
          profileSettings
        );
        await createOrUpdateProfilePublicData(userId, publicProfile);
      }

      // Set audit log record if this is not a new user as the new user
      // event is recorded with the user listener.
      if (change.before.exists) {
        await createAuditLogEvent({
          event: AUDIT_LOG_EVENTS.USER_PROFILE_UPDATED,
          userId,
        });
      }
    } catch (error) {
      throw Error(error);
    }
  });
