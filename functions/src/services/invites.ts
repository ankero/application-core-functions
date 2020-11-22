import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES, DATABASE_COLLECTIONS } from "../constants";
import { Invite } from "../interfaces";

// database
const db = admin.firestore();

export async function getInviteByInvitedUserIdentifier(
  invitedUserIdentifier: string,
  invitedUserIdentifierType: string
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

export async function createOrUpdateInvite(
  inviteId: string,
  invite: Invite
): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.invite.replace("{inviteId}", inviteId))
      .set(invite, { merge: true });
  } catch (error) {
    throw error;
  }
}
