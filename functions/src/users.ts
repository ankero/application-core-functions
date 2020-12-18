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
  gatherAllUserDataToCSV,
} from "./services/user";
import { deleteUserBucket } from "./services/storage";
import { claimInvitesForUser } from "./services/invites";
import { AuditLogEvents, UserPermissions } from "./interfaces";
import { updateObjectReferences } from "./services/references";
import { handleEntityClaims } from "./services/entityMemberHandlers";
import isEqual = require("lodash.isequal");

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

    await updateObjectReferences(
      user.uid,
      { deleted: true },
      DATABASE.users.collectionName
    );

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
      const oldDocument = change.before.exists ? change.before.data() : null;

      if (!document) {
        return;
      }

      if (oldDocument && document.updatedMillis === oldDocument.updatedMillis) {
        console.log("No updates to user.updatedMillis > exiting");
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
          DATABASE.users.collectionName
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
      throw error;
    }
  });

export const onUserClaimsChange = functions.firestore
  .document(DATABASE.users.documents.userPermissions)
  .onWrite(async (change, context) => {
    try {
      const { entityId } = context.params;
      const beforeData = change.before.data() || ({} as UserPermissions);
      const afterData = change.after.data() || ({} as UserPermissions);

      if (isEqual(beforeData, afterData)) {
        console.log("No updates");
        return;
      }

      await handleEntityClaims(entityId, afterData);
    } catch (error) {
      throw error;
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

export const downloadMyData = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || {};
    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    const result = await gatherAllUserDataToCSV(uid);

    await createAuditLogEvent({
      event: AuditLogEvents.USER_REQUESTED_DATA_DOWNLOAD,
      entityId: uid,
    });

    return result;
  } catch (error) {
    throw error;
  }
});
