import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import {
  handleExistingGroupUpdated,
  handleNewGroupCreated,
  updateGroup,
} from "./services/group";
import { deleteInvitesForEntity } from "./services/invites";
import { Group, InviteTargetType } from "./interfaces";
import { getPublicProfilesForMemberList } from "./services/entityMemberHandlers";

export const groupListener = functions.firestore
  .document(DATABASE_ADDRESSES.group)
  .onWrite(async (change, context) => {
    const { groupId } = context.params;
    const group = change.after.exists ? (change.after.data() as Group) : null;
    const prevGroup = change.before.exists
      ? (change.before.data() as Group)
      : null;

    let hasChangesInMembers = false;

    try {
      if (!group) {
        console.log("Group has been deleted, processing...");
        await deleteInvitesForEntity(groupId, InviteTargetType.GROUP);
      } else if (!prevGroup) {
        console.log("New group has been created, processing...");
        hasChangesInMembers = await handleNewGroupCreated(groupId, group);
      } else if (group && prevGroup) {
        console.log("Existing group has been updated, processing...");
        hasChangesInMembers = await handleExistingGroupUpdated(
          groupId,
          group,
          prevGroup
        );
      }

      if (group && hasChangesInMembers) {
        console.log(
          "Group member list has been updated, update public profiles to match."
        );
        const formattedMemberList = await getPublicProfilesForMemberList(
          group.members
        );

        await updateGroup(groupId, {
          ...group,
          formattedMemberList,
        });
      }
    } catch (error) {
      console.error(`Unable to process group with groupId: ${groupId}`, error);

      try {
        await updateGroup(groupId, {
          ...group,
          processingError: error.toString(),
        } as Group);
      } catch (recordErrorError) {
        console.error(
          `Unable to record error to group document with groupId: ${groupId}`
        );
        throw recordErrorError;
      }
      throw error;
    }
  });
