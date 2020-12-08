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
  prevGroup: Group,
  groupRef: admin.firestore.DocumentReference
): Promise<any> {
  try {
    const userInvokedChanges =
      group.name !== prevGroup.name ||
      group.description !== prevGroup.description;
    const { removedMembers, addedMembers } = compareOldAndNewEntityMembers(
      group,
      prevGroup,
      groupId
    );

    let newMemberList = {} as MembershipObject;
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
      userInvokedChanges ||
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
      await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        groupId,
        group,
        EntityType.GROUP
      );
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
    }

    return {
      hasChangesInMembers:
        Object.keys(removedMembers).length > 0 ||
        Object.keys(addedMembers).length > 0,
      updatedMembers: newMemberList,
    };
  } catch (error) {
    throw error;
  }
}
