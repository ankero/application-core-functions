import * as functions from "firebase-functions";

import { DATABASE } from "./constants";
import {
  handleExistingGroupUpdated,
  handleNewGroupCreated,
  updateGroup,
} from "./services/group";
import { deleteInvitesForEntity } from "./services/invites";
import { Group, InviteTargetType } from "./interfaces";
import { getPublicProfilesForMemberList } from "./services/entityMemberHandlers";

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
      await handleNewGroupCreated(entityId, group, change.ref);
      const formattedMemberList = await getPublicProfilesForMemberList(
        group.members
      );

      await updateGroup(entityId, {
        ...group,
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
      const hasChangesInMembers = await handleExistingGroupUpdated(
        entityId,
        group,
        prevGroup,
        change.after.ref
      );

      if (hasChangesInMembers) {
        const formattedMemberList = await getPublicProfilesForMemberList(
          group.members
        );

        await updateGroup(entityId, {
          ...group,
          formattedMemberList,
        });
      }
    } catch (error) {
      await handleGroupError(entityId, group, error);
      throw error;
    }
  });

export const onGroupDelete = functions.firestore
  .document(DATABASE.groups.documents.group)
  .onDelete(async (change, context) => {
    const { entityId } = context.params;

    try {
      await deleteInvitesForEntity(entityId, InviteTargetType.GROUP);
    } catch (error) {
      throw error;
    }
  });
