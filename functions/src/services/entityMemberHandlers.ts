import {
  InviteStatus,
  InviteTargetType,
  UserIdentifierType,
  PublicUserProfile,
  UserRoleType,
  UserRoleNumbers,
  OldAndNewEntityMemberComparison,
  InviteTargetPreview,
} from "../interfaces";
import {
  createOrUpdateInvite,
  deleteUnusedInviteForUserPerEntity,
} from "./invites";
import { getUserPublicProfile, getUsersBasedOnEmailOrNumber } from "./user";

export async function handleRemoveMultipleMembersFromEntity(
  removedMembers: Array<any>,
  inviteTargetId: string,
  inviteTargetType: InviteTargetType
): Promise<void> {
  try {
    const deleteInvitesPromises = [] as Array<any>;
    removedMembers.forEach((memberToRemove: any) => {
      const memberId = Object.keys(memberToRemove)[0];
      deleteInvitesPromises.push(
        deleteUnusedInviteForUserPerEntity(
          inviteTargetId,
          inviteTargetType,
          memberId
        )
      );
    });

    await Promise.all(deleteInvitesPromises);
  } catch (error) {
    throw error;
  }
}

export async function handleAddMultipleMembersToEntity(
  addedMembers: Array<any>,
  inviteTargetId: string,
  inviteTargetType: InviteTargetType,
  invitedBy: string,
  inviteTargetPreview: InviteTargetPreview,
  inviteTargetRef: any
): Promise<void> {
  try {
    const membersWhoNeedInvites = addedMembers.filter((newMember: any) => {
      return newMember[Object.keys(newMember)[0]] === UserRoleNumbers.INVITED;
    });

    // Build promises
    const newMemberPromises = membersWhoNeedInvites.map((newMember: any) => {
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
              inviteTargetType,
              inviteTargetId,
              inviteTargetPreview,
              inviteTargetRef,
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

export async function getPublicProfilesForMemberList(
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

export function compareOldAndNewEntityMembers(
  newEntity: any,
  oldEntity: any
): OldAndNewEntityMemberComparison {
  const removedMembers = [] as Array<any>;
  const addedMembers = [] as Array<any>;

  // Find new invited users
  Object.keys(newEntity.members).forEach((memberId: any) => {
    const foundInPrevDocument = Object.keys(oldEntity.members).includes(
      memberId
    );
    if (!foundInPrevDocument) {
      addedMembers.push({ [memberId]: newEntity.members[memberId] });
    }
  });

  // Find removed users
  Object.keys(oldEntity.members).forEach((memberId: any) => {
    const foundInNewDocument = Object.keys(newEntity.members).includes(
      memberId
    );
    if (!foundInNewDocument) {
      removedMembers.push({
        [memberId]: oldEntity.members[memberId],
      });
    }
  });

  return { removedMembers, addedMembers };
}
