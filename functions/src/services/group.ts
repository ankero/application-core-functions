import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";
import { Group, InviteTargetType } from "../interfaces";
import {
  compareOldAndNewEntityMembers,
  handleAddMultipleMembersToEntity,
  handleRemoveMultipleMembersFromEntity,
} from "./entityMemberHandlers";

// database
const db = admin.firestore();

export async function updateGroup(groupId: string, data: Group): Promise<void> {
  try {
    await db
      .doc(DATABASE_ADDRESSES.group.replace("{groupId}", groupId))
      .set({ ...data, processing: false }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function handleNewGroupCreated(
  groupId: string,
  group: Group
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

    await handleAddMultipleMembersToEntity(
      membersForNewGroup,
      groupId,
      InviteTargetType.GROUP,
      group.createdBy
    );

    return true;
  } catch (error) {
    throw error;
  }
}

export async function handleExistingGroupUpdated(
  groupId: string,
  group: Group,
  prevGroup: Group
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
      // Do something if it is necessary to update group metadata somewhere
    }

    // Remove members that are indicated to be removed
    if (removedMembers.length > 0) {
      await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        groupId,
        InviteTargetType.GROUP
      );
    }

    // Add members that are indicated to be added
    if (addedMembers.length > 0) {
      await handleAddMultipleMembersToEntity(
        addedMembers,
        groupId,
        InviteTargetType.GROUP,
        group.updatedBy || group.createdBy
      );
    }

    return removedMembers.length > 0 || addedMembers.length > 0;
  } catch (error) {
    throw error;
  }
}
