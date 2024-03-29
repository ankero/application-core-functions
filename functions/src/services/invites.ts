import * as admin from "firebase-admin";

import { DATABASE } from "../constants";
import {
  Invite,
  InviteStatus,
  EntityType,
  User,
  Group,
  UserIdentifierType,
  UserRoleNumbers,
  Notification,
  NotificationEventType,
} from "../interfaces";
import { handleGroupMembersUpdate } from "./group";
import {
  createOrUpdateNotification,
  getNotificationUri,
} from "./notifications";

// database
const db = admin.firestore();

export async function getInviteByInvitedUserIdentifier(
  invitedUserIdentifier: string,
  inviteTargetId: string,
  inviteTargetType: EntityType
): Promise<Invite | null> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.invites.collectionName)
      .where("invitedUserIdentifier", "==", invitedUserIdentifier)
      .where("inviteTargetId", "==", inviteTargetId)
      .where("inviteTargetType", "==", inviteTargetType)
      .get();

    if (querySnapshot.empty) {
      console.warn(
        `Invite does not exist. invitedUserIdentifier:${invitedUserIdentifier}`
      );
      return null;
    }

    return {
      ...(querySnapshot.docs[0].data() as Invite),
      id: querySnapshot.docs[0].id,
    };
  } catch (error) {
    throw error;
  }
}

export async function createInvite(invite: Invite): Promise<any | void> {
  try {
    return await db
      .collection(DATABASE.invites.collectionName)
      .add({ ...invite, updatedMillis: Date.now() });
  } catch (error) {
    throw error;
  }
}

export async function deleteUnusedInviteForUserPerEntity(
  inviteTargetId: string,
  inviteTargetType: string,
  invitedUserLiteral: string
): Promise<void> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.invites.collectionName)
      .where("inviteTargetId", "==", inviteTargetId)
      .where("inviteTargetType", "==", inviteTargetType)
      .where("invitedUserLiteral", "==", invitedUserLiteral)
      .get();

    if (querySnapshot.empty) {
      console.log(
        `No invite for user: ${invitedUserLiteral} with invite details: inviteTargetId:${inviteTargetId}, inviteTargetType:${inviteTargetType}`
      );
    } else {
      const batch = db.batch();
      querySnapshot.forEach((snapshot) => {
        if (snapshot.data().inviteStatus === InviteStatus.PENDING) {
          batch.delete(snapshot.ref);
        }
      });
      await batch.commit();
    }
  } catch (error) {
    throw error;
  }
}

export async function deleteInvitesForEntity(
  inviteTargetId: string,
  inviteTargetType: string
): Promise<void> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.invites.collectionName)
      .where("inviteTargetId", "==", inviteTargetId)
      .where("inviteTargetType", "==", inviteTargetType)
      .get();
    if (querySnapshot.empty) {
      console.log(
        `No invites found for deletion. inviteTargetId:${inviteTargetId}, inviteTargetType:${inviteTargetType}`
      );
    } else {
      const batch = db.batch();
      querySnapshot.forEach((snapshot) => batch.delete(snapshot.ref));
      await batch.commit();
    }
  } catch (error) {
    throw error;
  }
}

export async function createOrUpdateInvite(
  inviteId: string,
  invite: Invite
): Promise<void> {
  try {
    let id = inviteId;
    if (!inviteId) {
      const existingInvite = await getInviteByInvitedUserIdentifier(
        invite.invitedUserIdentifier,
        invite.inviteTargetId,
        invite.inviteTargetType
      );

      if (!existingInvite) {
        const doc = await createInvite(invite);
        if (invite.invitedUserIdentifierType === UserIdentifierType.USERID) {
          await createNotificationFromInvite({ ...invite, id: doc.id });
        }
        return;
      }

      id = existingInvite.id as string;
    }

    await db
      .doc(DATABASE.invites.documents.invite.replace("{entityId}", id))
      .set({ ...invite, updatedMillis: Date.now() }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function claimInvitesForUser(user: User): Promise<void> {
  try {
    const identifier = user.email || user.phoneNumber;
    const querySnapshot = await db
      .collection(DATABASE.invites.collectionName)
      .where("invitedUserIdentifier", "==", identifier)
      .where("invitedUserIdentifierType", "!=", UserIdentifierType.USERID)
      .get();

    if (querySnapshot.empty) {
      console.log(
        `No invites found for new user with identifier: ${identifier}.`
      );
    } else {
      const notificationPromises = [] as Array<Promise<void>>;
      const batch = db.batch();
      querySnapshot.forEach(async (snapshot) => {
        const id = snapshot.id;
        const invite = snapshot.data() as Invite;
        // Claim invite
        batch.set(
          snapshot.ref,
          {
            invitedUserIdentifierType: UserIdentifierType.USERID,
            invitedUserIdentifier: user.uid,
          },
          { merge: true }
        );
        // Send notification for new user
        notificationPromises.push(
          createNotificationFromInvite({
            ...invite,
            invitedUserIdentifier: user.uid,
            id,
          } as Invite)
        );
      });
      // Commit
      await batch.commit();
      await Promise.all(notificationPromises);
    }
  } catch (error) {
    throw error;
  }
}

export async function handleInvitationResponse(
  inviteId: string,
  invite: Invite
): Promise<void> {
  try {
    const doc = await invite.inviteTargetRef.get();
    if (!doc.exists) {
      console.log(
        `Entity refered in invite does not exist: ${JSON.stringify(invite)}`
      );
      await createOrUpdateInvite(inviteId, {
        ...invite,
        inviteStatus: InviteStatus.EXPIRED,
        error: "invite-target-not-found",
      });
      return;
    }

    const data = doc.data() || {};

    const invitedInMemberList = data.members[invite.invitedUserLiteral];

    const isValidInvite = invitedInMemberList === UserRoleNumbers.INVITED;

    if (!isValidInvite) {
      console.log(
        `Invite not valid, member does not exist or invite is not in pending state`
      );
      await createOrUpdateInvite(inviteId, {
        ...invite,
        inviteStatus: InviteStatus.EXPIRED,
        error: "invite-not-valid",
      });
      return;
    }

    let notificationEventType;

    if (invite.inviteStatus === InviteStatus.ACCEPTED) {
      notificationEventType = NotificationEventType.INVITE_ACCEPTED;

      if (invite.inviteTargetType !== EntityType.GROUP) {
        // Non groups handled directly
        await doc.ref.set(
          {
            members: {
              ...data.members,
              [invite.invitedUserIdentifier]: UserRoleNumbers.MEMBER,
              [invite.invitedUserLiteral]: admin.firestore.FieldValue.delete(),
            },
          },
          { merge: true }
        );
      } else {
        // Groups handled via members update
        const newMembers = {
          ...data.members,
          [invite.invitedUserIdentifier]: UserRoleNumbers.MEMBER,
        };
        delete newMembers[invite.invitedUserLiteral];
        await handleGroupMembersUpdate(doc.id, newMembers, {
          ...data,
          id: doc.id,
          ref: doc.ref,
        } as Group);
      }
    } else if (invite.inviteStatus === InviteStatus.REJECTED) {
      notificationEventType = NotificationEventType.INVITE_REJECTED;
      await doc.ref.set(
        {
          members: {
            ...data.members,
            [`${invite.invitedUserLiteral}`]: admin.firestore.FieldValue.delete(),
          },
        },
        { merge: true }
      );
    }

    if (notificationEventType) {
      await sendNotificationToInviteCreator(notificationEventType, invite);
    }
  } catch (error) {
    throw error;
  }
}

async function sendNotificationToInviteCreator(
  notificationEventType: NotificationEventType,
  invite: Invite
): Promise<void> {
  try {
    const notification = {
      userId: invite.invitedBy,
      eventType: notificationEventType,
      uri: getNotificationUri(
        notificationEventType,
        invite.inviteTargetId,
        invite.inviteTargetType
      ),
      referenceUserIds: [invite.invitedUserIdentifier],
      referenceEntityId: invite.inviteTargetId,
      referenceEntityType: invite.inviteTargetType,
      referenceEntityRef: invite.inviteTargetRef,
      referenceEntityUri: `/groups/${invite.inviteTargetId}`,
      referenceEntityPreview: invite.inviteTargetPreview,
    } as Notification;
    await createOrUpdateNotification(null, notification);
  } catch (error) {
    throw error;
  }
}

function createNotificationFromInvite(invite: Invite): Promise<void> {
  try {
    return createOrUpdateNotification(null, {
      userId: invite.invitedUserIdentifier,
      uri: getNotificationUri(
        NotificationEventType.INVITATION_RECEIVED,
        invite.id,
        invite.inviteTargetType
      ),
      referenceUserIds: [invite.invitedBy],
      referenceEntityId: invite.inviteTargetId,
      referenceEntityType: invite.inviteTargetType,
      referenceEntityRef: invite.inviteTargetRef,
      referenceEntityUri: `/invites/${invite.inviteTargetId}`,
      referenceEntityPreview: invite.inviteTargetPreview,
      eventType: NotificationEventType.INVITATION_RECEIVED,
    } as Notification);
  } catch (error) {
    throw error;
  }
}
