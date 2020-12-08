import * as admin from "firebase-admin";
import { GROUP_COMPOSITE_ID_PREFIX } from "../constants";
import {
  InviteStatus,
  EntityType,
  UserIdentifierType,
  PublicUserProfile,
  UserRoleType,
  UserRoleNumbers,
  OldAndNewEntityMemberComparison,
  EntityPreview,
  User,
  Group,
  Project,
  MembershipObject,
} from "../interfaces";
import { getMultipleGroupsById } from "./group";
import {
  createOrUpdateInvite,
  deleteUnusedInviteForUserPerEntity,
} from "./invites";
import { getUserPublicProfile, getUsersBasedOnEmailOrNumber } from "./user";

export function isInMembers(members: MembershipObject, entityId: string) {
  return members.hasOwnProperty(entityId);
}

export function isCompositeId(entityId: string) {
  return entityId.startsWith(GROUP_COMPOSITE_ID_PREFIX);
}

export function getPureId(entityId: string) {
  return entityId.replace(GROUP_COMPOSITE_ID_PREFIX, "");
}

export function getCompositeId(entityId: string) {
  return GROUP_COMPOSITE_ID_PREFIX + entityId;
}

export function isInFormattedMemberList(list: Array<any>, entityId: string) {
  return list.find((member) => member.id === entityId);
}

export async function handleRemoveMultipleMembersFromEntity(
  removedMembers: MembershipObject,
  entityId: string,
  entity: Group | Project,
  entityType: EntityType
): Promise<Array<string>> {
  try {
    const membersFromGroupsToBeRemovedFromEntity = [] as Array<string>;
    const removedUsers = [] as Array<string>;
    const removedGroups = [] as Array<string>;

    Object.keys(removedMembers).forEach((memberId: any) => {
      if (!isCompositeId(memberId)) {
        removedUsers.push(memberId);
      } else {
        removedGroups.push(memberId);
      }
    });

    if (removedUsers.length > 0) {
      // Note these may include direct group members but only if the user was promoted above group
      // There may be a bug here because of that, so keep an eye out
      const deleteInvitesPromises = [] as Array<Promise<any>>;
      removedUsers.forEach((memberId: string) => {
        if (removedMembers[memberId] === UserRoleNumbers.INVITED) {
          deleteInvitesPromises.push(
            deleteUnusedInviteForUserPerEntity(entityId, entityType, memberId)
          );
        }
      });
      await Promise.all(deleteInvitesPromises);
    }

    if (removedGroups.length > 0) {
      const groupIds = removedGroups.map(getPureId);
      const groups = await getMultipleGroupsById(groupIds);

      groups.forEach((group) => {
        const groupId = group.id as string;
        const compositeId = getCompositeId(groupId);
        const groupPermissionLevel =
          removedMembers[compositeId] || UserRoleNumbers.MEMBER;

        Object.keys(group.members).forEach((memberId: string) => {
          const memberPermissionLevel = entity.members[memberId];
          if (!memberPermissionLevel) {
            // This happens when user is invited via email/number and has not joined yet
            console.log(
              `User found in group but not from entity the group was member of. entityId:${entityId} entityType:${entityType} groupIds:${groupId} memberId:${memberId}`
            );
            return;
          }

          if (
            memberPermissionLevel <= groupPermissionLevel &&
            memberPermissionLevel > UserRoleNumbers.INVITED
          ) {
            membersFromGroupsToBeRemovedFromEntity.push(memberId);
          }
        });
      });
    }

    return membersFromGroupsToBeRemovedFromEntity;
  } catch (error) {
    throw error;
  }
}

export function filterNewMembersToUsersAndGroups(
  addedMembers: MembershipObject
): { userIds: Array<string>; groupIds: Array<string> } {
  const userIds = [] as Array<string>;
  const groupIds = [] as Array<string>;

  Object.keys(addedMembers).forEach((memberId: string) => {
    if (addedMembers[memberId] !== UserRoleNumbers.INVITED) {
      return;
    }

    if (!isCompositeId(memberId)) {
      userIds.push(memberId);
    } else {
      groupIds.push(getPureId(memberId));
    }
  });

  return { userIds, groupIds };
}

export async function handleAddMultipleMembersToEntity(
  members: MembershipObject,
  userIds: Array<string>,
  inviteTargetId: string,
  inviteTargetType: EntityType,
  invitedBy: string,
  inviteTargetPreview: EntityPreview,
  inviterProfile: User | null,
  inviteTargetRef: admin.firestore.DocumentReference
): Promise<void> {
  try {
    // Build promises for invites
    const newMemberPromises = userIds.map(getUsersBasedOnEmailOrNumber);

    // Handle user invites
    const invitesPromises = [] as Array<Promise<void>>;
    await Promise.all(newMemberPromises).then((responses: any[]) => {
      responses.forEach((response: any) => {
        const { user } = response;
        // Check if user does not exist or
        // User was invited by email or phone but user id already in entity
        if (!user || !isInMembers(members, user.id)) {
          const invitedUserIdentifierType = user
            ? UserIdentifierType.USERID
            : response.type;
          const invitedUserIdentifier = user ? user.id : response.emailOrNumber;

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
              inviterProfile,
              inviteTargetRef,
            })
          );
        }
      });
    });

    await Promise.all(invitesPromises);
  } catch (error) {
    throw error;
  }
}

export async function getPublicProfilesForMemberList(
  members: MembershipObject,
  prevFormattedMemberList: Array<PublicUserProfile> = []
): Promise<Array<PublicUserProfile>> {
  const formattedMemberList = [] as Array<PublicUserProfile>;

  // Filter out users that have been removed in this cycle
  const prevFormattedMemberListWithMembers = prevFormattedMemberList.filter(
    (member) => {
      const id =
        member.entityType === EntityType.GROUP
          ? getCompositeId(member.id)
          : member.id;
      return isInMembers(members, id);
    }
  );

  try {
    // Filter out members that are not invited and have type number as role
    // Explanation: If not number then firestore delete function
    const acceptedMembers = [] as Array<string>;
    const userIds = [] as Array<string>;
    const groupIds = [] as Array<string>;

    Object.keys(members).forEach((memberId: any) => {
      if (
        members[memberId] !== UserRoleNumbers.INVITED &&
        typeof members[memberId] === "number"
      ) {
        acceptedMembers.push(memberId);
      }
    });

    acceptedMembers.forEach((memberId) => {
      if (
        !isCompositeId(memberId) &&
        !isInFormattedMemberList(prevFormattedMemberList, memberId)
      ) {
        userIds.push(memberId);
      } else if (
        isCompositeId(memberId) &&
        !isInFormattedMemberList(
          prevFormattedMemberListWithMembers,
          getPureId(memberId)
        )
      ) {
        groupIds.push(memberId);
      }
    });

    if (userIds.length > 0) {
      const getPublicProfilesPromises = userIds.map(getUserPublicProfile);

      await Promise.all(getPublicProfilesPromises).then((profiles) => {
        profiles.forEach((profile) => {
          if (!profile) return;
          const roleNumber = members[profile.id] as any;
          formattedMemberList.push({
            ...profile,
            role: UserRoleNumbers[roleNumber] as UserRoleType,
          });
        });
      });
    }

    if (groupIds.length > 0) {
      const groups = await getMultipleGroupsById(groupIds.map(getPureId));
      groups.forEach((group: Group) => {
        const groupId = group.id as string;
        const groupCompositeId = getCompositeId(groupId);
        const roleNumber = members[groupCompositeId] as any;
        formattedMemberList.push({
          entityType: EntityType.GROUP,
          id: groupId,
          publicName: group.name,
          role: UserRoleNumbers[roleNumber] as UserRoleType,
          members: group.members,
        });
      });
    }

    return [...prevFormattedMemberListWithMembers, ...formattedMemberList];
  } catch (error) {
    return [...prevFormattedMemberListWithMembers, ...formattedMemberList];
  }
}

export function compareOldAndNewEntityMembers(
  newEntity: Group | Project,
  oldEntity: Group | Project,
  entityId?: string
): OldAndNewEntityMemberComparison {
  const removedMembers = {} as MembershipObject;
  const addedMembers = {} as MembershipObject;

  // Find new invited users
  Object.keys(newEntity.members).forEach((memberId: any) => {
    let isSelfEntity = false;
    const foundInPrevDocument = isInMembers(oldEntity.members, memberId);
    if (isCompositeId(memberId)) {
      isSelfEntity = entityId === getPureId(memberId);
    }
    if (!foundInPrevDocument && !isSelfEntity) {
      // Push if not already added and this is not self added with composite id
      // The composite ID check needs to be done to make sure group doesn't add itself to itself
      // I'm sure there's a meme about this somewhere...
      addedMembers[memberId] = newEntity.members[memberId];
    }
  });

  // Find removed users
  Object.keys(oldEntity.members).forEach((memberId: any) => {
    if (!isInMembers(newEntity.members, memberId)) {
      removedMembers[memberId] = oldEntity.members[memberId];
    }
  });

  return { removedMembers, addedMembers };
}

export async function handleAddMultipleGroupsToEntity(
  groupIds: Array<string>,
  members: MembershipObject,
  entityRef: admin.firestore.DocumentReference,
  commitUpdate: boolean
): Promise<{
  groups: Array<Group>;
  members: MembershipObject;
}> {
  try {
    const updateData = {} as MembershipObject;
    const groups = await getMultipleGroupsById(groupIds);

    groups.forEach((group) => {
      const groupId = group.id as string;
      updateData[`members.${getCompositeId(groupId)}`] = UserRoleNumbers.MEMBER;
      members[getCompositeId(groupId)] = UserRoleNumbers.MEMBER;

      Object.keys(group.members).forEach((userId: string) => {
        // If user is not a member of the group yet, then we can ignore the user now
        if (group.members[userId] < UserRoleNumbers.MEMBER) {
          return;
        }
        if (!isInMembers(members, userId)) {
          // User does not exist in entity yet so lets add to newMembers array
          updateData[`members.${userId}`] = UserRoleNumbers.MEMBER;
          members[userId] = UserRoleNumbers.MEMBER;
        } else {
          // If user is already in entity but is less than a member then promote as member
          // Leave invite as if user accepts it the user will then become a direct member
          const userRoleInMembers = members[userId] as UserRoleNumbers;
          if (userRoleInMembers < UserRoleNumbers.MEMBER) {
            updateData[`members.${userId}`] = UserRoleNumbers.MEMBER;
            members[userId] = UserRoleNumbers.MEMBER;
          }
        }
      });
    });

    if (commitUpdate) {
      await entityRef.update(updateData);
    }

    return { members, groups };
  } catch (error) {
    throw error;
  }
}
