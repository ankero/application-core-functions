import * as admin from "firebase-admin";
import { STORAGE } from "../constants";

const bucket = admin.storage().bucket();

export async function deleteUserBucket(userId: string) {
  try {
    // Delete user public files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE.userPublicFiles.replace("{entityId}", userId),
    });

    // Delete user private files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE.userPrivateFiles.replace("{entityId}", userId),
    });
    return true;
  } catch (error) {
    throw error;
  }
}
