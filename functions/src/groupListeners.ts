import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import {
  getUserPublicProfile,
  getUsersBasedOnEmailOrNumber,
} from "./services/user";
import { updateGroup } from "./services/group";
import {
  createOrUpdateInvite,
  deleteInviteForUserPerEntity,
  deleteInvitesForEntity,
} from "./services/invites";
import {
  Group,
  InviteStatus,
  InviteTargetType,
  PublicUserProfile,
  UserIdentifierType,
  UserRoleNumbers,
  UserRoleType,
} from "./interfaces";

async function handleRemoveSingleMember(
  memberIdentifier: string,
  groupId: string
): Promise<any> {
  try {
    return await deleteInviteForUserPerEntity(
      groupId,
      InviteTargetType.GROUP,
      memberIdentifier
    );
  } catch (error) {
    throw error;
  }
}

async function handleRemoveMultipleMembers(
  removedMembers: Array<any>,
  groupId: string
): Promise<void> {
  try {
    const deleteInvitesPromises = [] as Array<any>;
    removedMembers.forEach((memberToRemove: any) => {
      const memberId = Object.keys(memberToRemove)[0];
      deleteInvitesPromises.push(handleRemoveSingleMember(memberId, groupId));
    });

    await Promise.all(deleteInvitesPromises);
  } catch (error) {
    throw error;
  }
}

async function handleAddMembers(
  addedMembers: Array<any>,
  groupId: string,
  invitedBy: string
): Promise<void> {
  try {
    // Build promises
    const newMemberPromises = addedMembers.map((newMember: any) => {
      const emailOrNumber = Object.keys(newMember)[0];
      return getUsersBasedOnEmailOrNumber(emailOrNumber);
    });

    const invitesPromises = [] as Array<Promise<void>>;

    // Get all users
    await Promise.all(newMemberPromises).then((responses: any[]) => {
      responses.forEach((response: any) => {
        if (
          !response.user ||
          !Object.keys(addedMembers).includes(response.user.id)
        ) {
          const invitedUserIdentifierType = response.user
            ? UserIdentifierType.USERID
            : response.type;
          const invitedUserIdentifier = response.user
            ? response.user.id
            : response.emailOrNumber;

          // Record invite
          invitesPromises.push(
            createOrUpdateInvite("", {
              invitedBy,
              inviteStatus: InviteStatus.PENDING,
              invitedUserIdentifierType,
              invitedUserIdentifier,
              invitedUserLiteral: response.emailOrNumber,
              inviteTargetType: InviteTargetType.GROUP,
              inviteTargetId: groupId,
            })
          );
        }
      });
    });

    if (invitesPromises.length > 0) {
      await Promise.all(invitesPromises);
    }
  } catch (error) {
    throw error;
  }
}

async function populatePublicProfiles(
  members: Array<any>
): Promise<Array<PublicUserProfile>> {
  const formattedMemberList = [] as Array<PublicUserProfile>;

  try {
    const acceptedMembers = Object.keys(members).filter((memberId: any) => {
      return members[memberId] !== UserRoleNumbers.INVITED;
    });

    const getPublicProfilesPromises = acceptedMembers.map(
      (memberId: string) => {
        return getUserPublicProfile(memberId);
      }
    );

    await Promise.all(getPublicProfilesPromises).then((profiles) => {
      profiles.forEach((profile) => {
        if (!profile) return;

        const profileId = profile.id as any;

        formattedMemberList.push({
          ...profile,
          role: UserRoleNumbers[members[profileId]] as UserRoleType,
        });
      });
    });

    return formattedMemberList;
  } catch (error) {
    return formattedMemberList;
  }
}

function compareNewAndOldGroup(group: Group, prevGroup: Group) {
  const userInvokedChanges =
    group.name !== prevGroup.name ||
    group.description !== prevGroup.description;
  const removedMembers = [] as Array<any>;
  const addedMembers = [] as Array<any>;

  // Find new invited users
  Object.keys(group.members).forEach((memberId: any) => {
    const foundInPrevDocument = Object.keys(prevGroup.members).includes(
      memberId
    );
    if (!foundInPrevDocument) {
      addedMembers.push({ [memberId]: group.members[memberId] });
    }
  });

  // Find removed users
  Object.keys(prevGroup.members).forEach((memberId: any) => {
    const foundInNewDocument = Object.keys(group.members).includes(memberId);
    if (!foundInNewDocument) {
      removedMembers.push({
        [memberId]: prevGroup.members[memberId],
      });
    }
  });

  return { userInvokedChanges, removedMembers, addedMembers };
}

export const groupListener = functions.firestore
  .document(DATABASE_ADDRESSES.group)
  .onWrite(async (change, context) => {
    // Get groupId
    const { groupId } = context.params;

    // Get document
    const group = change.after.exists ? (change.after.data() as Group) : null;
    const prevGroup = change.before.exists
      ? (change.before.data() as Group)
      : null;

    try {
      // Check if the document was deleted
      if (!group) {
        console.log("Group has been deleted, processing...");
        // Group has been deleted
        // Delete any invites related to this group
        return await deleteInvitesForEntity(groupId, InviteTargetType.GROUP);
      }

      let hasChangesInMembers = false;

      if (!prevGroup) {
        console.log("New group has been created, processing...");
        // This is a new group, send invites to new members
        hasChangesInMembers = true;
        const membersForNewGroup = [] as Array<any>;
        Object.keys(group.members).forEach((memberId: any) => {
          if (memberId !== group.createdBy) {
            membersForNewGroup.push({
              [memberId]: group.members[memberId],
            });
          }
        });
        await handleAddMembers(membersForNewGroup, groupId, group.createdBy);
      } else if (group && prevGroup) {
        console.log("Existing group has been updated, processing...");
        // This is a old group, check for changes
        const {
          userInvokedChanges,
          removedMembers,
          addedMembers,
        } = compareNewAndOldGroup(group, prevGroup);

        hasChangesInMembers =
          removedMembers.length > 0 || addedMembers.length > 0;

        if (userInvokedChanges) {
          // Do something if it is necessary to update group metadata somewhere
        }

        // Remove members that are indicated to be removed
        if (removedMembers.length > 0) {
          await handleRemoveMultipleMembers(removedMembers, groupId);
        }

        // Add members that are indicated to be added
        if (addedMembers.length > 0) {
          await handleAddMembers(
            addedMembers,
            groupId,
            group.updatedBy || group.createdBy
          );
        }
      }

      // For new group or group with member changes, populate public profiles again
      if (hasChangesInMembers) {
        // Populate formattedMemberList
        const formattedMemberList = await populatePublicProfiles(group.members);

        // Update group
        // This will fire this event again, however, since there are no changes done there will be no loop
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
