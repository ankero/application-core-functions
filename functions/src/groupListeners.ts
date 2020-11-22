import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import { getApplicationUserConfiguration } from "./services/application";
import {
  buildUserPublicProfile,
  getUsersBasedOnEmailOrNumber,
} from "./services/user";
import { createOrUpdateGroup } from "./services/group";
import { createOrUpdateInvite } from "./services/invites";
import { Group, InviteStatus, InviteTargetType } from "./interfaces";

function handleRemoveMembers(document: any): any {
  let removeMembers = [...document.removeMembers];
  let members = [...document.members];
  let editors = [...document.editors];
  let formattedMemberList = [...document.formattedMemberList];

  // Remove creator from list
  removeMembers = removeMembers.filter((removeMemberId: string) => {
    return removeMemberId !== document.createdBy;
  });
  // Remove from member list
  members = members.filter((removeMemberId: string) => {
    return !removeMembers.find(
      (removeUid: string) => removeUid === removeMemberId
    );
  });
  // Remove from editor
  editors = editors.filter((editorId: string) => {
    return !removeMembers.find((removeUid: string) => removeUid === editorId);
  });
  // Remove from formattedMemberList
  formattedMemberList = formattedMemberList.filter((member: any) => {
    return !removeMembers.find((removeUid: string) => removeUid === member.id);
  });

  return {
    ...document,
    removeMembers,
    members,
    editors,
    formattedMemberList,
  };
}

async function handleAddMembers(document: any): Promise<any> {
  let formattedMemberList = [...document.formattedMemberList];

  // Get user profile settings
  const profileSettings = await getApplicationUserConfiguration();

  // Build promises
  const newMemberPromises = document.addMembers.map(
    getUsersBasedOnEmailOrNumber
  );

  const invitesPromises = [] as Array<Promise<void>>;

  // Get all users
  await Promise.all(newMemberPromises).then((responses: any[]) => {
    responses.forEach((response: any) => {
      if (!response.user) {
        // Send blind invite
        invitesPromises.push(
          createOrUpdateInvite("", {
            invitedBy: document.updatedBy || document.createdBy,
            inviteStatus: InviteStatus.PENDING,
            invitedUserIdentifierType: response.type,
            invitedUserIdentifier: response.emailOrNumber,
            inviteTargetType: InviteTargetType.GROUP,
            inviteTargetId: document.id,
          })
        );
      } else if (!document.members.includes(response.user.id)) {
        // Send invite to user by id
        invitesPromises.push(
          createOrUpdateInvite("", {
            invitedBy: document.updatedBy || document.createdBy,
            inviteStatus: InviteStatus.PENDING,
            invitedUserIdentifierType: response.type,
            invitedUserIdentifier: response.emailOrNumber,
            inviteTargetType: InviteTargetType.GROUP,
            inviteTargetId: document.id,
          })
        );

        invitesPromises.push(
          createOrUpdateInvite(response.user.id, response.type)
        );
      } else {
        // Existing user, lets just update the profile
        // Build public profile and push to formattedMemberList
        const publicProfile = buildUserPublicProfile(
          response.user,
          profileSettings
        );
        formattedMemberList = formattedMemberList.map((member: any) => {
          if (member.id !== publicProfile.id) return member;
          return publicProfile;
        });
      }
    });
  });

  if (invitesPromises.length > 0) {
    await Promise.all(invitesPromises);
  }

  return {
    ...document,
    formattedMemberList,
  };
}

export const groupListener = functions.firestore
  .document(DATABASE_ADDRESSES.group)
  .onWrite(async (change, context) => {
    // Get groupId
    const { groupId } = context.params;

    // Get document
    const document = change.after.exists
      ? (change.after.data() as Group)
      : null;

    if (!document) return;

    // Init all required values
    let workingDocument = {
      ...document,
      id: groupId,
      formattedMemberList: document.formattedMemberList || [],
      editors: document.editors || [document.createdBy],
      members: document.members || [],
      addMembers: document.addMembers || [],
    };

    try {
      // Remove members that are indicated to be removed
      if (document.removeMembers && document.removeMembers.length > 0) {
        workingDocument = handleRemoveMembers(workingDocument);
      }

      // Add members that are indicated to be added
      if (document.addMembers && document.addMembers.length > 0) {
        workingDocument = await handleAddMembers(workingDocument);
      }

      // Create new document and set addMembers and removeMembers to empty
      const newDocument = {
        ...workingDocument,
        addMembers: [],
        removeMembers: [],
        processed: true,
      } as Group;

      await createOrUpdateGroup(groupId, newDocument);
    } catch (error) {
      console.error(`Unable to process group with groupId: ${groupId}`, error);
      try {
        await createOrUpdateGroup(groupId, {
          ...document,
          processingError: error.toString(),
        });
      } catch (recordErrorError) {
        console.error(
          `Unable to record error to group document with groupId: ${groupId}`
        );
        throw recordErrorError;
      }
      throw error;
    }
  });
