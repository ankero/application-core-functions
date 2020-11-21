import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES, DATABASE_COLLECTIONS } from "../constants";
import { isEmailOrNumber } from "./validators";

interface User {
  id: string;
}

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

export async function getUserPublicProfile(userId: string): Promise<any> {
  try {
    const doc = await db
      .doc(DATABASE_ADDRESSES.userPublicProfile.replace("{userId}", userId))
      .get();
    if (!doc.exists) {
      console.warn(`User public profile does not exist: ${userId}`);
      return null;
    }
    return doc.data();
  } catch (error) {
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<any> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.users)
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      console.warn(`User with email ${email} does not exist`);
      return null;
    }
    console.log(`ITEM ID ${querySnapshot.docs[0].id}`);
    return {
      ...querySnapshot.docs[0].data(),
      id: querySnapshot.docs[0].id,
    };
  } catch (error) {
    throw error;
  }
}

export async function getUserByNumber(number: string): Promise<any> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.users)
      .where("phoneNumber", "==", number)
      .get();

    if (querySnapshot.empty) {
      console.warn(`User with number ${number} does not exist`);
      return null;
    }

    console.log(`ITEM ID ${querySnapshot.docs[0].id}`);

    return {
      ...querySnapshot.docs[0].data(),
      id: querySnapshot.docs[0].id,
    };
  } catch (error) {
    throw error;
  }
}

export async function getUsersBasedOnEmailOrNumber(
  emailOrNumber: string
): Promise<User | void> {
  const { email, number } = isEmailOrNumber(emailOrNumber);
  let user;
  if (email) {
    user = await getUserByEmail(email);
  } else if (number) {
    user = await getUserByNumber(number);
  }

  return user;
}

export function buildUserPublicProfile(user: any, profileSettings: any) {
  const publicProfile = {
    id: user.id,
  } as any;
  const publicKeys = profileSettings.userFields.filter(
    (item: any) => item.public
  );
  publicKeys.forEach((item: any) => {
    if (user && user[item.fieldKey]) {
      publicProfile[item.fieldKey] = user[item.fieldKey];
    }
  });
  return publicProfile;
}
