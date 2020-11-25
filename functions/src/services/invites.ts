import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES, DATABASE_COLLECTIONS } from "../constants";
import { Invite, UserIdentifierType } from "../interfaces";

// database
const db = admin.firestore();

export async function getInviteByInvitedUserIdentifier(
  invitedUserIdentifier: string,
  invitedUserIdentifierType: UserIdentifierType
): Promise<Invite | null> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.invites)
      .where("invitedUserIdentifier", "==", invitedUserIdentifier)
      .where("invitedUserIdentifierType", "==", invitedUserIdentifierType)
      .get();

    if (querySnapshot.empty) {
      console.warn(
        `Invite does not exist. invitedUserIdentifier:${invitedUserIdentifier}, invitedUserIdentifierType:${invitedUserIdentifierType}`
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
    await db.collection(DATABASE_COLLECTIONS.invites).add(invite);
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
        invite.invitedUserIdentifierType
      );

      if (!existingInvite) {
        return await createInvite(invite);
      }

      id = existingInvite.id as string;
    }

    await db
      .doc(DATABASE_ADDRESSES.invite.replace("{inviteId}", id))
      .set(invite, { merge: true });
  } catch (error) {
    throw error;
  }
}
