import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Init admin
// admin.initializeApp({}, "profileListener");

// database
const db = admin.firestore();

interface ProfileSettings {
  userFields: Array<ProfileItem>;
}

interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

const DATABASE = {
  user: "/users/{userId}",
  configuration: "/application/USER_CONFIGURATION",
  publicData: "/users/{userId}/PUBLIC_PROFILE/profile",
  auditData: "/users/{userId}/AUDIT_LOG/{logId}",
};

async function getProfileSettings(): Promise<ProfileSettings> {
  try {
    const doc = await db.doc(DATABASE.configuration).get();
    const empty = { userFields: [] };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ProfileSettings) || empty;
  } catch (error) {
    throw Error(error);
  }
}

async function setProfilePublicData(
  userId: string,
  data: object
): Promise<void> {
  try {
    await db
      .doc(DATABASE.publicData.replace("{userId}", userId))
      .set(data, { merge: true });
  } catch (error) {
    throw Error(error);
  }
}

async function setProfileAuditLog(userId: string): Promise<void> {
  try {
    await db
      .doc(
        DATABASE.auditData
          .replace("{userId}", userId)
          .replace("{logId}", `log_${Date.now()}`)
      )
      .set({
        event: "UPDATED_PROFILE",
        timestamp: Date.now(),
      });
  } catch (error) {
    throw Error(error);
  }
}

export const userProfileListener = functions.firestore
  .document(DATABASE.user)
  .onWrite(async (change, context) => {
    try {
      // Get userId
      const { userId } = context.params;

      // Get document
      const document = change.after.exists ? change.after.data() : {};

      // Get user profile settings
      const profileSettings = await getProfileSettings();

      // Set public profile based on profile settings
      if (profileSettings && profileSettings.userFields) {
        const publicProfile = {} as any;
        const publicKeys = profileSettings.userFields.filter(
          (item) => item.public
        );
        publicKeys.forEach((item) => {
          if (document && document[item.fieldKey]) {
            publicProfile[item.fieldKey] = document[item.fieldKey];
          }
        });
        await setProfilePublicData(userId, publicProfile);
      }

      // Set audit log record
      await setProfileAuditLog(userId);
    } catch (error) {
      throw Error(error);
    }
  });
