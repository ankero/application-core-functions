import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import { getApplicationUserConfiguration } from "./services/application";
import {
  buildUserPublicProfile,
  getUsersBasedOnEmailOrNumber,
} from "./services/user";
import { createOrUpdateGroup } from "./services/group";

export const groupListener = functions.firestore
  .document(DATABASE_ADDRESSES.group)
  .onWrite(async (change, context) => {
    try {
      // Get groupId
      const { groupId } = context.params;

      // Get document
      const document = change.after.exists ? change.after.data() : null;

      if (!document) return;

      // Init all required values
      document.formattedMemberList = document.formattedMemberList || [];
      document.editors = document.editors || [document.createdBy];
      document.members = document.members || [];

      // Remove members that are indicated to be removed
      if (document.removeMembers && document.removeMembers.length > 0) {
        // Remove creator from list
        document.removeMembers = document.removeMembers.filter(
          (removeMemberId: string) => {
            return removeMemberId !== document.createdBy;
          }
        );
        // Remove from member list
        document.members = document.members.filter((removeMemberId: string) => {
          return !document.removeMembers.find(
            (removeUid: string) => removeUid === removeMemberId
          );
        });
        // Remove from editor
        document.editors = document.editors.filter((editorId: string) => {
          return !document.removeMembers.find(
            (removeUid: string) => removeUid === editorId
          );
        });
        // Remove from formattedMemberList
        document.formattedMemberList = document.formattedMemberList.filter(
          (member: any) => {
            return !document.removeMembers.find(
              (removeUid: string) => removeUid === member.id
            );
          }
        );
      }

      // Add members that are indicated to be added
      if (document.addMembers && document.addMembers.length > 0) {
        // Get user profile settings
        const profileSettings = await getApplicationUserConfiguration();

        // Build promises
        const newMemberPromises = document.addMembers.map(
          getUsersBasedOnEmailOrNumber
        );

        // Get all users
        await Promise.all(newMemberPromises).then((users: any[]) => {
          users.forEach((user: any) => {
            if (!user) {
              console.log(`User not found - Handle with invites TODO`);
            }
            // If a new member, then push to members
            if (!document.members.includes(user.id)) {
              document.members.push(user.id);
            }
            // Build public profile and push to formattedMemberList
            const publicProfile = buildUserPublicProfile(user, profileSettings);
            document.formattedMemberList.push(publicProfile);
          });
        });
      }

      // Create new document and set addMembers and removeMembers to empty
      const newDocument = {
        ...document,
        addMembers: [],
        removeMembers: [],
      };

      await createOrUpdateGroup(groupId, newDocument);
    } catch (error) {
      throw Error(error);
    }
  });
