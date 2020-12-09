import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import {
  Project,
  EntityPreview,
  EntityType,
  MembershipObject,
} from "../interfaces";
import {
  compareOldAndNewEntityMembers,
  filterNewMembersToUsersAndGroups,
  handleAddMultipleMembersToEntity,
  handleRemoveMultipleMembersFromEntity,
  handleAddMultipleGroupsToEntity,
  getPublicProfilesForMemberList,
} from "./entityMemberHandlers";
import { updateObjectReferences } from "./references";
import { getUserPublicProfile } from "./user";

// database
const db = admin.firestore();

export async function updateProject(
  projectId: string,
  data: Project | any
): Promise<void> {
  try {
    await db
      .doc(DATABASE.projects.documents.project.replace("{entityId}", projectId))
      .set(
        { ...data, processing: false, processingError: "" },
        { merge: true }
      );
  } catch (error) {
    throw error;
  }
}

export async function getProjectById(
  projectId: string
): Promise<Project | null> {
  try {
    const project = await db
      .doc(DATABASE.projects.documents.project.replace("{entityId}", projectId))
      .get();

    if (!project.exists) {
      return null;
    }

    return {
      ...project.data(),
      id: projectId,
      ref: project.ref,
    } as Project;
  } catch (error) {
    throw error;
  }
}

export async function removeProjectMember(
  projectId: string,
  project: Project,
  memberId: string
): Promise<void> {
  try {
    const newMemberObject = {
      ...project.members,
      [memberId]: admin.firestore.FieldValue.delete(),
    };

    await db
      .doc(DATABASE.projects.documents.project.replace("{entityId}", projectId))
      .set({ members: newMemberObject }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function handleNewProjectCreated(
  projectId: string,
  project: Project,
  projectRef: admin.firestore.DocumentReference
): Promise<any> {
  try {
    const { userIds, groupIds } = filterNewMembersToUsersAndGroups(
      project.members
    );
    let newMemberList = {} as MembershipObject;

    if (userIds.length > 0) {
      const inviter = await getUserPublicProfile(project.createdBy);

      const inviteTargetPreview = {
        name: project.name,
      } as EntityPreview;

      await handleAddMultipleMembersToEntity(
        project.members,
        userIds,
        projectId,
        EntityType.PROJECT,
        project.createdBy,
        inviteTargetPreview,
        inviter,
        projectRef
      );
    }

    if (groupIds.length > 0) {
      const { members } = await handleAddMultipleGroupsToEntity(
        groupIds,
        project.members,
        projectRef,
        false
      );
      newMemberList = { ...newMemberList, ...members };
    }

    return {
      hasChangesInMembers: userIds.length > 0 || groupIds.length > 0,
      updatedMembers: newMemberList,
    };
  } catch (error) {
    throw error;
  }
}

export async function handleExistingProjectUpdated(
  projectId: string,
  project: Project,
  prevProject: Project
): Promise<void> {
  try {
    const userInvokedChanges =
      project.name !== prevProject.name ||
      project.description !== prevProject.description;
    const { removedMembers, addedMembers } = compareOldAndNewEntityMembers(
      project.members,
      prevProject.members
    );

    if (userInvokedChanges) {
      await updateObjectReferences(
        projectId,
        { name: project.name, description: project.description },
        DATABASE.projects.collectionName
      );
    }

    if (
      Object.keys(removedMembers).length > 0 ||
      Object.keys(addedMembers).length > 0
    ) {
      const formattedMemberList = await getPublicProfilesForMemberList(
        project.members,
        project.formattedMemberList
      );

      await updateProject(projectId, {
        formattedMemberList,
      });
    }
  } catch (error) {
    throw error;
  }
}

export async function handleProjectMembersUpdate(
  projectId: string,
  newMembers: MembershipObject,
  project: Project
): Promise<{ hasChangesInMembers: boolean; updatedMembers: MembershipObject }> {
  try {
    const { removedMembers, addedMembers } = compareOldAndNewEntityMembers(
      newMembers,
      project.members
    );
    let newMemberList = addedMembers;

    // Remove members that are indicated to be removed
    if (Object.keys(removedMembers).length > 0) {
      const userIdsToRemove = await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        projectId,
        project,
        EntityType.PROJECT
      );
      userIdsToRemove.forEach((userId) => {
        newMemberList[userId] = admin.firestore.FieldValue.delete();
      });
    }

    // Add members that are indicated to be added
    if (Object.keys(addedMembers).length > 0) {
      const { userIds, groupIds } = filterNewMembersToUsersAndGroups(
        addedMembers
      );

      if (userIds.length > 0) {
        const inviter = await getUserPublicProfile(
          project.updatedBy || project.createdBy
        );

        const inviteTargetPreview = {
          name: project.name,
        } as EntityPreview;

        await handleAddMultipleMembersToEntity(
          project.members,
          userIds,
          projectId,
          EntityType.PROJECT,
          project.updatedBy || project.createdBy,
          inviteTargetPreview,
          inviter,
          project.ref
        );
      }

      if (groupIds.length > 0) {
        const { members } = await handleAddMultipleGroupsToEntity(
          groupIds,
          project.members,
          project.ref,
          false
        );
        newMemberList = { ...newMemberList, ...members };
      }
    }

    if (Object.keys(newMemberList).length > 0) {
      await project.ref.set({ members: newMemberList }, { merge: true });
    }

    return {
      hasChangesInMembers: Object.keys(newMemberList).length > 0,
      updatedMembers: newMemberList,
    };
  } catch (error) {
    throw error;
  }
}
