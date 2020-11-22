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
