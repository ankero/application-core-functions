import * as admin from "firebase-admin";
import { STORAGE_ADDRESSES } from "../constants";

const bucket = admin.storage().bucket();

export async function deleteUserBucket(userId: string) {
  try {
    // Delete user public files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE_ADDRESSES.userPublicFiles.replace("{userId}", userId),
    });

    // Delete user private files
    await bucket.deleteFiles({
      force: true,
      prefix: STORAGE_ADDRESSES.userPrivateFiles.replace("{userId}", userId),
    });
    return true;
  } catch (error) {
    throw error;
  }
}
