import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";
import { Group } from "../interfaces";

// database
const db = admin.firestore();

export async function createOrUpdateGroup(
  groupId: string,
  data: Group
): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.group.replace("{groupId}", groupId))
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}
