import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";

// database
const db = admin.firestore();

export async function createOrUpdateProfile(
  userId: string,
  data: object
): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.user.replace("{userId}", userId))
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function createOrUpdateProfilePublicData(
  userId: string,
  data: object
): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.userPublicProfile.replace("{userId}", userId))
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function deleteProfile(userId: string) {
  try {
    await db.doc(DATABASE_ADDRESSES.user.replace("{userId}", userId)).delete();
  } catch (error) {
    throw error;
  }
}
