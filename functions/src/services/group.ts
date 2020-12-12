import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import {
  Group,
  EntityPreview,
  EntityType,
  UserRoleNumbers,
  MembershipObject,
} from "../interfaces";
import {
  compareOldAndNewEntityMembers,
  filterNewMembersToUsersAndGroups,
  getPublicProfilesForMemberList,
  handleAddMultipleGroupsToEntity,
  handleAddMultipleMembersToEntity,
  handleRemoveMultipleMembersFromEntity,
} from "./entityMemberHandlers";
import { updateObjectReferences } from "./references";
import { getUserPublicProfile } from "./user";

// database
const db = admin.firestore();

export async function updateGroup(
  groupId: string,
  data: Group | any
): Promise<void> {
  try {
    await db
      .doc(DATABASE.groups.documents.group.replace("{entityId}", groupId))
      .set({ ...data, processing: false }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function getMultipleGroupsById(
  groupIds: Array<string>
): Promise<Array<Group>> {
  try {
    const promises = groupIds.map(getGroupById);
    const groups = await Promise.all(promises);
    const validGroups = groups.filter((group) => !!group);
    return validGroups as Array<Group>;
  } catch (error) {
    throw error;
  }
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    const group = await db
      .doc(DATABASE.groups.documents.group.replace("{entityId}", groupId))
      .get();

    if (!group.exists) {
      return null;
    }

    return {
      ...group.data(),
      id: groupId,
      ref: group.ref,
    } as Group;
  } catch (error) {
    throw error;
  }
}

export async function removeGroupMember(
  groupId: string,
  group: Group,
  memberId: string
): Promise<void> {
  try {
    const newMemberObject = {
      ...group.members,
      [memberId]: admin.firestore.FieldValue.delete(),
    };

    await db
      .doc(DATABASE.groups.documents.group.replace("{entityId}", groupId))
      .set({ members: newMemberObject }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function handleNewGroupCreated(
  groupId: string,
  group: Group,
  groupRef: any
): Promise<any> {
  try {
    const { userIds, groupIds } = filterNewMembersToUsersAndGroups(
      group.members
    );
    let newMemberList = {} as MembershipObject;
    if (userIds.length > 0) {
      const inviter = await getUserPublicProfile(group.createdBy);

      const inviteTargetPreview = {
        name: group.name,
      } as EntityPreview;

      await handleAddMultipleMembersToEntity(
        group.members,
        userIds,
        groupId,
        EntityType.GROUP,
        group.createdBy,
        inviteTargetPreview,
        inviter,
        groupRef
      );
    }
    if (groupIds.length > 0) {
      const { members } = await handleAddMultipleGroupsToEntity(
        groupIds,
        group.members,
        groupRef,
        false
      );
      newMemberList = { ...newMemberList, ...members };
    }

    return {
      hasChangesInMembers: userIds.length > 0 || groupIds.length > 0,
      updatedMembers: newMemberList,
    };
  } catch (error) {
    throw error;
  }
}

export async function handleExistingGroupUpdated(
  groupId: string,
  group: Group,
  prevGroup: Group
): Promise<void> {
  try {
    const userInvokedChanges =
      group.name !== prevGroup.name ||
      group.description !== prevGroup.description;
    const {
      removedMembers,
      addedMembers,
      updatedPermissions,
    } = compareOldAndNewEntityMembers(
      group.members,
      prevGroup.members,
      groupId
    );

    if (userInvokedChanges) {
      await updateObjectReferences(
        groupId,
        {
          name: group.name,
          publicName: group.name,
          description: group.description,
          members: group.members,
        },
        DATABASE.groups.collectionName
      );
    }

    if (
      Object.keys(removedMembers).length > 0 ||
      Object.keys(addedMembers).length > 0 ||
      Object.keys(updatedPermissions).length > 0
    ) {
      const formattedMemberList = await getPublicProfilesForMemberList(
        group.members,
        group.formattedMemberList
      );

      await updateGroup(groupId, {
        formattedMemberList,
      });
    }
  } catch (error) {
    throw error;
  }
}

export async function handleGroupMembersUpdate(
  groupId: string,
  newMembers: MembershipObject,
  group: Group
): Promise<{ hasChangesInMembers: boolean; updatedMembers: MembershipObject }> {
  try {
    const {
      removedMembers,
      addedMembers,
      updatedPermissions,
    } = compareOldAndNewEntityMembers(newMembers, group.members, groupId);

    let newMemberList = { ...newMembers, ...updatedPermissions };
    const removedNonInvitedMembers = [] as Array<string>;
    const addedNonInvitedMembers = [] as Array<string>;

    Object.keys(removedMembers).forEach((memberId) => {
      if (removedMembers[memberId] > UserRoleNumbers.INVITED) {
        removedNonInvitedMembers.push(memberId);
      }
    });

    Object.keys(addedMembers).forEach((memberId) => {
      if (addedMembers[memberId] > UserRoleNumbers.INVITED) {
        addedNonInvitedMembers.push(memberId);
      }
    });

    if (
      removedNonInvitedMembers.length > 0 ||
      addedNonInvitedMembers.length > 0
    ) {
      await updateObjectReferences(
        groupId,
        {
          name: group.name,
          publicName: group.name,
          description: group.description,
          members: group.members,
        },
        DATABASE.groups.collectionName,
        removedNonInvitedMembers,
        addedNonInvitedMembers
      );
    }

    // Remove members that are indicated to be removed
    if (Object.keys(removedMembers).length > 0) {
      const userIdsToRemove = await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        groupId,
        group,
        EntityType.GROUP
      );
      userIdsToRemove.forEach((userId) => {
        newMemberList[userId] = admin.firestore.FieldValue.delete();
      });
    }

    // Add members that are indicated to be added
    if (Object.keys(addedMembers).length > 0) {
      const { userIds, groupIds } = filterNewMembersToUsersAndGroups(
        addedMembers
      );

      if (userIds.length > 0) {
        const inviter = await getUserPublicProfile(
          group.updatedBy || group.createdBy
        );

        const inviteTargetPreview = {
          name: group.name,
        } as EntityPreview;

        await handleAddMultipleMembersToEntity(
          group.members,
          userIds,
          groupId,
          EntityType.GROUP,
          group.updatedBy || group.createdBy,
          inviteTargetPreview,
          inviter,
          group.ref
        );
      }

      if (groupIds.length > 0) {
        const { members } = await handleAddMultipleGroupsToEntity(
          groupIds,
          group.members,
          group.ref,
          false
        );
        newMemberList = { ...newMemberList, ...members };
      }
    }

    if (Object.keys(newMemberList).length > 0) {
      await group.ref.set({ members: newMemberList }, { merge: true });
    }

    return {
      hasChangesInMembers: Object.keys(newMemberList).length > 0,
      updatedMembers: newMemberList,
    };
  } catch (error) {
    throw error;
  }
}
