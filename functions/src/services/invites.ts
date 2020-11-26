import * as admin from "firebase-admin";

import { DATABASE_ADDRESSES, DATABASE_COLLECTIONS } from "../constants";
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
      .collection(DATABASE_COLLECTIONS.invites)
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
      .collection(DATABASE_COLLECTIONS.invites)
      .add({ ...invite, updatedMillis: Date.now() });
  } catch (error) {
    throw error;
  }
}

export async function deleteInviteForUserPerEntity(
  inviteTargetId: string,
  inviteTargetType: string,
  invitedUserLiteral: string
): Promise<void> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.invites)
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
      querySnapshot.forEach((snapshot) =>
        deletePromises.push(snapshot.ref.delete())
      );
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
      .collection(DATABASE_COLLECTIONS.invites)
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
      .doc(DATABASE_ADDRESSES.invite.replace("{inviteId}", id))
      .set({ ...invite, updatedMillis: Date.now() }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function claimInvitesForUser(user: User): Promise<void> {
  try {
    const identifier = user.email || user.phoneNumber;
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.invites)
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
    const rootAddress = DATABASE_ADDRESSES[invite.inviteTargetType].replace(
      "{entityId}",
      invite.inviteTargetId
    );

    const doc = await db.doc(rootAddress).get();
    if (!doc.exists) {
      console.log(
        `Entity refered in invite does not exist: ${JSON.stringify(invite)}`
      );
      await createOrUpdateInvite(inviteId, {
        ...invite,
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
        error: "invite-not-valid",
      });
      return;
    }

    const newRoleNumber =
      invite.inviteStatus === InviteStatus.ACCEPTED
        ? UserRoleNumbers.MEMBER
        : UserRoleNumbers.REJECTED;

    await doc.ref.update({
      [`members.${invite.invitedUserIdentifier}`]: newRoleNumber,
      [`members.${invite.invitedUserLiteral}`]: admin.firestore.FieldValue.delete(),
    });
  } catch (error) {
    throw error;
  }
}
