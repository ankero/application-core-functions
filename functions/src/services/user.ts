import * as admin from "firebase-admin";
import { uniqueNamesGenerator, colors, animals } from "unique-names-generator";
import { DATABASE } from "../constants";
import { isEmailOrNumber } from "./validators";
import {
  EntityType,
  MembershipObject,
  PublicUserProfile,
  User,
  UserIdentifierType,
  UserRoleNumbers,
} from "../interfaces";
import { deleteCollection } from "./collection";
import { saveJSONToStorage } from "./storage";
import { isCompositeId } from "./entityMemberHandlers";

// database
const db = admin.firestore();

export async function createOrUpdateProfile(
  userId: string,
  data: User | any
): Promise<void> {
  try {
    await db
      .doc(DATABASE.users.documents.user.replace("{entityId}", userId))
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
      .doc(
        DATABASE.users.documents.userPublicProfile.replace("{entityId}", userId)
      )
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function removeMultipleUserPermissions(
  members: Array<string>,
  targetEntityId: string,
  targetEntityType: EntityType
): Promise<void> {
  try {
    const entityCompositeId = [`${targetEntityType}:${targetEntityId}`] as any;
    const updatePromises = [] as Array<Promise<any>>;

    members.forEach((userId) => {
      if (isCompositeId(userId)) return;
      const address = DATABASE.users.documents.userPermissions.replace(
        "{entityId}",
        userId
      );
      console.log(`Delete permission to user ${userId} to address: ${address}`);
      updatePromises.push(
        db.doc(address).set(
          {
            [entityCompositeId]: admin.firestore.FieldValue.delete(),
          },
          {
            merge: true,
          }
        )
      );
    });
    await Promise.all(updatePromises);
  } catch (error) {
    throw error;
  }
}

export async function updateMultipleUserPermissions(
  members: MembershipObject,
  targetEntityId: string,
  targetEntityType: EntityType
): Promise<void> {
  try {
    const entityCompositeId = [`${targetEntityType}:${targetEntityId}`] as any;
    const updatePromises = [] as Array<Promise<any>>;

    Object.keys(members).forEach((userId) => {
      console.log(`Check user: ${userId}`);
      if (isCompositeId(userId)) return;
      if (members[userId] < UserRoleNumbers.MEMBER) return;

      const address = DATABASE.users.documents.userPermissions.replace(
        "{entityId}",
        userId
      );
      console.log(`Add permission to user ${userId} to address: ${address}`);
      updatePromises.push(
        db.doc(address).set(
          {
            [entityCompositeId]: members[userId],
          },
          {
            merge: true,
          }
        )
      );
    });
    await Promise.all(updatePromises);
  } catch (error) {
    throw error;
  }
}

export async function updateUserPermissions(
  userId: string,
  data: PublicUserProfile
): Promise<void> {
  try {
    await db
      .doc(
        DATABASE.users.documents.userPermissions.replace("{entityId}", userId)
      )
      .set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function deleteProfile(userId: string): Promise<void> {
  try {
    const { collections } = DATABASE.users as { [key: string]: any };
    const deleteSubcollectionsPromises = [] as Array<Promise<void>>;
    Object.keys(collections).forEach((key: string) => {
      if (!collections.hasOwnProperty(key)) return;
      const { collectionName } = collections[key];
      deleteSubcollectionsPromises.push(
        deleteCollection(collectionName.replace("{entityId}", userId))
      );
    });

    await Promise.all(deleteSubcollectionsPromises);
    await db
      .doc(DATABASE.users.documents.user.replace("{entityId}", userId))
      .delete();
  } catch (error) {
    throw error;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const doc = await db
      .doc(DATABASE.users.documents.user.replace("{entityId}", userId))
      .get();
    if (!doc.exists) {
      console.warn(`User public profile does not exist: ${userId}`);
      return null;
    }
    return {
      ...doc.data(),
      id: userId,
    } as User;
  } catch (error) {
    throw error;
  }
}

export async function getUserPublicProfile(
  userId: string
): Promise<PublicUserProfile | null> {
  try {
    const doc = await db
      .doc(
        DATABASE.users.documents.userPublicProfile.replace("{entityId}", userId)
      )
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

export async function listUserPublicProfiles(
  userIds: Array<string>
): Promise<Array<PublicUserProfile>> {
  try {
    const profilePromises = [] as Array<Promise<PublicUserProfile | null>>;

    userIds.forEach((userId: string) => {
      profilePromises.push(getUserPublicProfile(userId));
    });

    const profiles = await Promise.all(profilePromises);
    const notNullProfiles = profiles.filter((profile) => !!profile);
    return notNullProfiles.map((profile) => profile as PublicUserProfile);
  } catch (error) {
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | any> {
  try {
    const querySnapshot = await db
      .collection(DATABASE.users.collectionName)
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
      .collection(DATABASE.users.collectionName)
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
): Promise<{ emailOrNumber: string; type: UserIdentifierType; user: User }> {
  const { email, number } = isEmailOrNumber(emailOrNumber);
  let type = UserIdentifierType.EMAIL;
  let user;
  if (email) {
    type = UserIdentifierType.EMAIL;
    user = await getUserByEmail(email);
  } else if (number) {
    type = UserIdentifierType.NUMBER;
    user = await getUserByNumber(number);
  }

  if (user) {
    type = UserIdentifierType.USERID;
  }

  return {
    emailOrNumber,
    type,
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

export async function gatherAllUserDataToCSV(userId: string): Promise<any> {
  try {
    const reportId = `data_export_${Date.now()}`;

    // Add more data here
    // For example links to all images and other entities created by the user
    const profile = await getUser(userId);

    const response = await saveJSONToStorage(
      `users/${userId}/PRIVATE/`,
      `${reportId}.csv`,
      profile
    );

    return response;
  } catch (error) {
    throw error;
  }
}

export function getRandomName(): string {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals],
    separator: " ",
    length: 2,
    style: "capital",
  });
}

export function getRandomAvatar(seed: string | number | undefined): string {
  return `https://avatars.dicebear.com/api/identicon/${seed || new Date()}.svg`;
}
