import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";

// interface User {
//   uid: string;
//   publicName?: string;
//   publicPhotoUrl?: string;
// }

// interface Group {
//   createdBy: string;
//   members: Array<string>;
//   editors: Array<string>;
//   formattedMemberList: Array<User>;
//   addMembers: Array<string> | any;
//   removeMembers: Array<string> | any;
// }

// database
const db = admin.firestore();

export async function createOrUpdateGroup(
  groupId: string,
  data: any
): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.group.replace("{groupId}", groupId))
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}
