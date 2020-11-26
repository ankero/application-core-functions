import * as admin from "firebase-admin";
import { uniqueNamesGenerator, colors, animals } from "unique-names-generator";
import { DATABASE_ADDRESSES, DATABASE_COLLECTIONS } from "../constants";
import { isEmailOrNumber } from "./validators";
import { PublicUserProfile, User, UserIdentifierType } from "../interfaces";

// database
const db = admin.firestore();

export async function createOrUpdateProfile(
  userId: string,
  data: User
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
  data: PublicUserProfile
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
    await db
      .doc(DATABASE_ADDRESSES.userPublicProfile.replace("{userId}", userId))
      .delete();
    await db.doc(DATABASE_ADDRESSES.user.replace("{userId}", userId)).delete();
  } catch (error) {
    throw error;
  }
}

export async function getUserPublicProfile(
  userId: string
): Promise<PublicUserProfile | null> {
  try {
    const doc = await db
      .doc(DATABASE_ADDRESSES.userPublicProfile.replace("{userId}", userId))
      .get();
    if (!doc.exists) {
      console.warn(`User public profile does not exist: ${userId}`);
      return null;
    }
    return {
      ...doc.data(),
      id: userId,
    } as PublicUserProfile;
  } catch (error) {
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | any> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.users)
      .where("email", "==", email)
      .get();

    if (querySnapshot.empty) {
      console.warn(`User with email ${email} does not exist`);
      return null;
    }

    return {
      ...querySnapshot.docs[0].data(),
      id: querySnapshot.docs[0].id,
    };
  } catch (error) {
    throw error;
  }
}

export async function getUserByNumber(number: string): Promise<User | null> {
  try {
    const querySnapshot = await db
      .collection(DATABASE_COLLECTIONS.users)
      .where("phoneNumber", "==", number)
      .get();

    if (querySnapshot.empty) {
      console.warn(`User with number ${number} does not exist`);
      return null;
    }

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
): Promise<any> {
  const { email, number } = isEmailOrNumber(emailOrNumber);
  let type, user;
  if (email) {
    type = UserIdentifierType.EMAIL;
    user = await getUserByEmail(email);
  } else if (number) {
    type = UserIdentifierType.NUMBER;
    user = await getUserByNumber(number);
  }

  return {
    emailOrNumber,
    type: user ? UserIdentifierType.USERID : type,
    user,
  };
}

export function buildUserPublicProfile(
  user: any,
  profileSettings: any
): PublicUserProfile {
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
  return publicProfile as PublicUserProfile;
}

export function getRandomName(): string {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals],
    separator: " ",
    length: 2,
    style: "lowerCase",
  });
}

export function getRandomAvatar(seed: string | number | undefined): string {
  return `https://avatars.dicebear.com/api/identicon/${seed || new Date()}.svg`;
}
