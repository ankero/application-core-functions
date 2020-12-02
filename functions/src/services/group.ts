import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import { Group, EntityPreview, EntityType } from "../interfaces";
import {
  compareOldAndNewEntityMembers,
  handleAddMultipleMembersToEntity,
  handleRemoveMultipleMembersFromEntity,
} from "./entityMemberHandlers";
import { updateObjectReferences } from "./references";
import { getUserPublicProfile } from "./user";

// database
const db = admin.firestore();

export async function updateGroup(groupId: string, data: Group): Promise<void> {
  try {
    await db
      .doc(DATABASE.groups.documents.group.replace("{entityId}", groupId))
      .set({ ...data, processing: false }, { merge: true });
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
): Promise<boolean> {
  try {
    const membersForNewGroup = [] as Array<any>;
    Object.keys(group.members).forEach((memberId: any) => {
      if (memberId !== group.createdBy) {
        membersForNewGroup.push({
          [memberId]: group.members[memberId],
        });
      }
    });

    const inviter = await getUserPublicProfile(group.createdBy);

    const inviteTargetPreview = {
      name: group.name,
    } as EntityPreview;

    await handleAddMultipleMembersToEntity(
      membersForNewGroup,
      groupId,
      EntityType.GROUP,
      group.createdBy,
      inviteTargetPreview,
      inviter,
      groupRef
    );

    return true;
  } catch (error) {
    throw error;
  }
}

export async function handleExistingGroupUpdated(
  groupId: string,
  group: Group,
  prevGroup: Group,
  groupRef: any
): Promise<boolean> {
  try {
    // This is a old group, check for changes
    const userInvokedChanges =
      group.name !== prevGroup.name ||
      group.description !== prevGroup.description;
    const { removedMembers, addedMembers } = compareOldAndNewEntityMembers(
      group,
      prevGroup
    );

    if (userInvokedChanges) {
      await updateObjectReferences(
        groupId,
        { name: group.name, description: group.description },
        DATABASE.groups.collectionName
      );
    }

    // Remove members that are indicated to be removed
    if (removedMembers.length > 0) {
      await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        groupId,
        EntityType.GROUP
      );
    }

    // Add members that are indicated to be added
    if (addedMembers.length > 0) {
      const inviter = await getUserPublicProfile(
        group.updatedBy || group.createdBy
      );

      const inviteTargetPreview = {
        name: group.name,
      } as EntityPreview;

      await handleAddMultipleMembersToEntity(
        addedMembers,
        groupId,
        EntityType.GROUP,
        group.updatedBy || group.createdBy,
        inviteTargetPreview,
        inviter,
        groupRef
      );
    }

    return removedMembers.length > 0 || addedMembers.length > 0;
  } catch (error) {
    throw error;
  }
}
