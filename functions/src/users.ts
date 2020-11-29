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
import { updateObjectReferences } from "./services/references";

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const userSettings = await getApplicationUserConfiguration();

  // Define wether to generate random name & avatar
  // If false and not found, then still generate
  const publicName = userSettings.generateRandomNameOnCreate
    ? getRandomName()
    : user.displayName || getRandomName();
  const publicPhotoUrl = userSettings.generateRandomAvatarOnCreate
    ? getRandomAvatar(user.uid)
    : user.photoURL || getRandomAvatar(user.uid);

  await createOrUpdateProfile(user.uid, {
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    publicName,
    publicPhotoUrl,
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

export const onUserUpdated = functions.firestore
  .document(DATABASE.users.documents.user)
  .onWrite(async (change, context) => {
    try {
      // Get userId
      const { entityId } = context.params;

      // Get document
      const document = change.after.exists ? change.after.data() : null;

      if (!document) {
        return;
      }

      // Get user profile settings
      const profileSettings = await getApplicationUserConfiguration();

      // Set public profile based on profile settings
      if (profileSettings && profileSettings.userFields) {
        const publicProfile = buildUserPublicProfile(
          { ...document, id: entityId },
          profileSettings
        );
        await createOrUpdateProfilePublicData(entityId, publicProfile);
        await updateObjectReferences(
          entityId,
          publicProfile,
          profileSettings.publicProfileLinks
        );
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

export const acceptPrivacyPolicy = functions.https.onCall(
  async (data, context) => {
    try {
      const { uid } = context.auth || {};
      if (!uid) {
        throw new Error("UNAUTHORIZED");
      }

      await createOrUpdateProfile(uid, {
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedMillis: Date.now(),
      });

      await createAuditLogEvent({
        event: AuditLogEvents.USER_APPROVED_PRIVACY_POLICY,
        entityId: uid,
      });
    } catch (error) {
      throw error;
    }
  }
);
