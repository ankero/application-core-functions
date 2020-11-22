import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import {
  getUserPublicProfile,
  getUsersBasedOnEmailOrNumber,
} from "./services/user";
import { updateGroup } from "./services/group";
import { createOrUpdateInvite } from "./services/invites";
import {
  Group,
  InviteStatus,
  InviteTargetType,
  PublicUserProfile,
  UserIdentifierType,
} from "./interfaces";

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

async function handleAddMembers(
  document: any,
  groupId: string
): Promise<number> {
  let pendingInvites = 0;

  // Build promises
  const newMemberPromises = document.addMembers.map(
    getUsersBasedOnEmailOrNumber
  );

  const invitesPromises = [] as Array<Promise<void>>;

  // Get all users
  await Promise.all(newMemberPromises).then((responses: any[]) => {
    responses.forEach((response: any) => {
      if (!response.user || !document.members.includes(response.user.id)) {
        pendingInvites = pendingInvites + 1;
        const invitedUserIdentifierType = response.user
          ? UserIdentifierType.USERID
          : response.type;
        const invitedUserIdentifier = response.user
          ? response.user.id
          : response.emailOrNumber;
        // Record invite
        invitesPromises.push(
          createOrUpdateInvite("", {
            invitedBy: document.updatedBy || document.createdBy,
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

  return pendingInvites;
}

async function populatePublicProfiles(
  document: any
): Promise<Array<PublicUserProfile>> {
  try {
    const missingProfiles = document.members.filter((memberId: string) => {
      return !document.formattedMemberList.find(
        (formattedMember: PublicUserProfile) => formattedMember.id === memberId
      );
    });

    if (missingProfiles.length === 0) {
      return document.formattedMemberList;
    }

    const getPublicProfilesPromises = missingProfiles.map(getUserPublicProfile);

    await Promise.all(getPublicProfilesPromises).then((profiles) => {
      profiles.forEach((profile) => {
        if (!profile) return;
        document.formattedMemberList.push(profile);
      });
    });

    return document.formattedMemberList;
  } catch (error) {
    return document.formattedMemberList;
  }
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

    // Check if the document was deleted OR has it already been processed
    if (!document || document.processed) return;

    // Init all required values
    let workingDocument = {
      ...document,
      formattedMemberList: document.formattedMemberList || [],
      editors: document.editors || [document.createdBy],
      members: document.members || [],
      addMembers: document.addMembers || [],
      pendingInvites: 0,
      processingError: "",
    };

    try {
      // Remove members that are indicated to be removed
      if (document.removeMembers && document.removeMembers.length > 0) {
        workingDocument = handleRemoveMembers(workingDocument);
      }

      // Add members that are indicated to be added
      if (document.addMembers && document.addMembers.length > 0) {
        workingDocument.pendingInvites = await handleAddMembers(
          workingDocument,
          groupId
        );
      }

      // Populate formattedMemberList
      workingDocument.formattedMemberList = await populatePublicProfiles(
        workingDocument
      );

      // Create new document and set addMembers and removeMembers to empty
      const newDocument = {
        ...workingDocument,
        addMembers: [],
        removeMembers: [],
      } as Group;

      await updateGroup(groupId, newDocument);
    } catch (error) {
      console.error(`Unable to process group with groupId: ${groupId}`, error);
      try {
        await updateGroup(groupId, {
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
