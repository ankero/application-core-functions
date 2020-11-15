import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface ProfileSettings {
  userFields: Array<ProfileItem>;
}

interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

const DATABASE = {
  watch: "/users/{userId}",
  configuration: "/application/USER_CONFIGURATION",
  publicData: "/users/{userId}/PUBLIC_PROFILE",
};

// Init admin
admin.initializeApp();

// database
const db = admin.firestore();

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
    await db.doc(DATABASE.publicData.replace("{userId}", userId)).set(data);
  } catch (error) {
    throw Error(error);
  }
}

async function setProfileAuditLog(userId: string): Promise<void> {
  try {
    await db
      .doc(
        `${DATABASE.publicData.replace(
          "{userId}",
          userId
        )}/${`log_${Date.now()}`}`
      )
      .set({
        type: "UPDATED_PROFILE",
        timestamp: Date.now(),
      });
  } catch (error) {
    throw Error(error);
  }
}

export const userProfileUpdatesListener = functions.firestore
  .document(DATABASE.watch)
  .onWrite(async (change, context) => {
    // Get userId
    const { userId, auth, authType, eventType, timestamp } = context.params;
    console.log(userId, JSON.stringify(auth), authType, eventType, timestamp);
    // Get document
    const document = change.after.exists ? change.after.data() : {};

    // Get user profile settings
    const profileSettings = await getProfileSettings();

    // Set public profile based on profile settings
    if (profileSettings && profileSettings.userFields) {
      const publicKeys = profileSettings.userFields.filter(
        (item) => item.public
      );
      const publicData = publicKeys.map((item) => {
        return document && document[item.fieldKey];
      });
      await setProfilePublicData(userId, publicData);
    }

    // Set audit log record
    await setProfileAuditLog(userId);
  });
