import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Init admin
// admin.initializeApp({}, "userListener");

// database
const db = admin.firestore();

const DATABASE = {
  user: "/users/{userId}",
  auditData: "/users/{userId}/AUDIT_LOG/{logId}",
};

async function createProfile(userId: string, data: object): Promise<void> {
  try {
    await db
      .doc(DATABASE.user.replace("{userId}", userId))
      .set(data, { merge: true });
  } catch (error) {
    throw Error(error);
  }
}

async function createProfileCreationAuditLog(userId: string): Promise<void> {
  try {
    await db
      .doc(
        DATABASE.auditData
          .replace("{userId}", userId)
          .replace("{logId}", `log_${Date.now()}`)
      )
      .set({
        event: "CREATED_PROFILE",
        timestamp: Date.now(),
      });
  } catch (error) {
    throw Error(error);
  }
}

export const userCreationListener = functions.auth
  .user()
  .onCreate(async (user) => {
    await createProfile(user.uid, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
    await createProfileCreationAuditLog(user.uid);
  });
