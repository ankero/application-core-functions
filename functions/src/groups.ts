import * as functions from "firebase-functions";

import { DATABASE } from "./constants";
import {
  getGroupById,
  handleExistingGroupUpdated,
  handleGroupMembersUpdate,
  handleNewGroupCreated,
  removeGroupMember,
  updateGroup,
} from "./services/group";
import { deleteInvitesForEntity } from "./services/invites";
import { Group, EntityType, UserRoleNumbers } from "./interfaces";
import { getPublicProfilesForMemberList } from "./services/entityMemberHandlers";
import { deleteObjectReferences } from "./services/references";
import { getValidMemberObject } from "./services/validators";

async function handleGroupError(
  entityId: string,
  group: Group,
  error: Error
): Promise<void> {
  console.error(`Unable to process group with groupId: ${entityId}`, error);

  try {
    await updateGroup(entityId, {
      ...group,
      processingError: error.toString(),
    } as Group);
  } catch (recordErrorError) {
    console.error(
      `Unable to record error to group document with groupId: ${entityId}`
    );
    throw recordErrorError;
  }
}

export const onGroupCreate = functions.firestore
  .document(DATABASE.groups.documents.group)
  .onCreate(async (change, context) => {
    const { entityId } = context.params;
    const group = change.data() as Group;

    try {
      const { updatedMembers } = await handleNewGroupCreated(
        entityId,
        group,
        change.ref
      );
      const formattedMemberList = await getPublicProfilesForMemberList(
        group.members,
        group.formattedMemberList
      );

      await updateGroup(entityId, {
        members: {
          ...group.members,
          ...updatedMembers,
        },
        formattedMemberList,
      });
    } catch (error) {
      await handleGroupError(entityId, group, error);
      throw error;
    }
  });

export const onGroupUpdate = functions.firestore
  .document(DATABASE.groups.documents.group)
  .onUpdate(async (change, context) => {
    const { entityId } = context.params;
    const group = change.after.data() as Group;
    const prevGroup = change.before.data() as Group;

    try {
      await handleExistingGroupUpdated(entityId, group, prevGroup);
    } catch (error) {
      await handleGroupError(entityId, group, error);
      throw error;
    }
  });

export const onGroupDelete = functions.firestore
  .document(DATABASE.groups.documents.group)
  .onDelete(async (change, context) => {
    const { entityId } = context.params;
    const group = change.data() as Group;

    try {
      const nonInvitedMembers = [] as Array<string>;
      Object.keys(group.members).forEach((memberId) => {
        const memberRole = group.members[memberId] as UserRoleNumbers;
        if (memberRole > UserRoleNumbers.INVITED) {
          nonInvitedMembers.push(memberId);
        }
      });
      await deleteObjectReferences(
        entityId,
        DATABASE.groups.collectionName,
        EntityType.GROUP,
        nonInvitedMembers
      );
      await deleteInvitesForEntity(entityId, EntityType.GROUP);
    } catch (error) {
      throw error;
    }
  });

export const updateGroupMembers = functions.https.onCall(
  async (data, context) => {
    try {
      const { uid } = context.auth || ({} as any);

      if (!uid) {
        throw new Error("UNAUTHORIZED");
      }

      const { groupId, members } = data;

      if (!groupId) {
        throw new Error("GROUP ID MISSING");
      }

      if (!members) {
        throw new Error("MEMBERS DATA MISSING");
      }

      const group = await getGroupById(groupId);

      if (!group) {
        // This is really "not found" but we don't want to expose this
        // info to potential hackers
        throw new Error("UNAUTHORIZED");
      }

      const userRole = group.members[uid];

      if (!userRole) {
        throw new Error("UNAUTHORIZED");
      }

      if (userRole < UserRoleNumbers.EDITOR) {
        throw new Error("UNAUTHORIZED");
      }

      await handleGroupMembersUpdate(
        groupId,
        getValidMemberObject(groupId, members),
        group
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
);

export const leaveGroup = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || ({} as any);

    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    const { groupId } = data;

    if (!groupId) {
      throw new Error("GROUP ID MISSING");
    }

    const group = await getGroupById(groupId);

    if (!group) {
      throw new Error("Not found");
    }

    const userRole = group.members[uid];

    if (!userRole) {
      throw new Error("Not found");
    }

    if (userRole === UserRoleNumbers.OWNER) {
      throw new Error("Owners cannot remove self");
    }

    const membersWithoutUser = { ...group.members };
    delete membersWithoutUser[uid];

    await removeGroupMember(groupId, group, uid);
    await handleGroupMembersUpdate(groupId, membersWithoutUser, group);

    return { success: true };
  } catch (error) {
    throw error;
  }
});
