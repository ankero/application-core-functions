import * as admin from "firebase-admin";

import { DATABASE } from "../constants";
import {
  Invite,
  InviteStatus,
  InviteTargetType,
  User,
  UserIdentifierType,
  UserRoleNumbers,
} from "../interfaces";

// database
const db = admin.firestore();

export async function getInviteByInvitedUserIdentifier(
  invitedUserIdentifier: string,
  inviteTargetId: string,
  inviteTargetType: InviteTargetType
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

export async function createInvite(invite: Invite): Promise<void> {
  try {
    await db
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
      const deletePromises = [] as Array<Promise<any>>;
      querySnapshot.forEach((snapshot) => {
        if (snapshot.data().inviteStatus === InviteStatus.PENDING) {
          deletePromises.push(snapshot.ref.delete());
        }
      });
      await Promise.all(deletePromises);
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
      const deletePromises = [] as Array<Promise<any>>;
      querySnapshot.forEach((snapshot) =>
        deletePromises.push(snapshot.ref.delete())
      );
      await Promise.all(deletePromises);
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
        return await createInvite(invite);
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
      const deletePromises = [] as Array<Promise<any>>;
      querySnapshot.forEach((snapshot) =>
        snapshot.ref.set(
          {
            invitedUserIdentifierType: UserIdentifierType.USERID,
            invitedUserIdentifier: user.uid,
          },
          { merge: true }
        )
      );
      await Promise.all(deletePromises);
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

    if (invite.inviteStatus === InviteStatus.ACCEPTED) {
      await doc.ref.set(
        {
          members: {
            ...data.members,
            [`${invite.invitedUserIdentifier}`]: UserRoleNumbers.MEMBER,
            [`${invite.invitedUserLiteral}`]: admin.firestore.FieldValue.delete(),
          },
        },
        { merge: true }
      );
    } else if (invite.inviteStatus === InviteStatus.REJECTED) {
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
  } catch (error) {
    throw error;
  }
}
