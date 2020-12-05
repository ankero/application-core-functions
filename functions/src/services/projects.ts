import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import { Project, EntityPreview, EntityType } from "../interfaces";
import {
  compareOldAndNewEntityMembers,
  handleAddMultipleMembersToEntity,
  handleRemoveMultipleMembersFromEntity,
} from "./entityMemberHandlers";
import { updateObjectReferences } from "./references";
import { getUserPublicProfile } from "./user";

// database
const db = admin.firestore();

export async function updateProject(
  projectId: string,
  data: Project
): Promise<void> {
  try {
    await db
      .doc(DATABASE.projects.documents.project.replace("{entityId}", projectId))
      .set({ ...data, processing: false }, { merge: true });
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
  projectRef: any
): Promise<boolean> {
  try {
    const membersForNewProject = [] as Array<any>;
    Object.keys(project.members).forEach((memberId: any) => {
      if (memberId !== project.createdBy) {
        membersForNewProject.push({
          [memberId]: project.members[memberId],
        });
      }
    });

    const inviter = await getUserPublicProfile(project.createdBy);

    const inviteTargetPreview = {
      name: project.name,
    } as EntityPreview;

    await handleAddMultipleMembersToEntity(
      membersForNewProject,
      projectId,
      EntityType.PROJECT,
      project.createdBy,
      inviteTargetPreview,
      inviter,
      projectRef
    );

    return true;
  } catch (error) {
    throw error;
  }
}

export async function handleExistingProjectUpdated(
  projectId: string,
  project: Project,
  prevProject: Project,
  projectRef: any
): Promise<boolean> {
  try {
    // This is a old Project, check for changes
    const userInvokedChanges =
      project.name !== prevProject.name ||
      project.description !== prevProject.description;
    const { removedMembers, addedMembers } = compareOldAndNewEntityMembers(
      project,
      prevProject
    );

    if (userInvokedChanges) {
      await updateObjectReferences(
        projectId,
        { name: project.name, description: project.description },
        DATABASE.projects.collectionName
      );
    }

    // Remove members that are indicated to be removed
    if (removedMembers.length > 0) {
      await handleRemoveMultipleMembersFromEntity(
        removedMembers,
        projectId,
        EntityType.PROJECT
      );
    }

    // Add members that are indicated to be added
    if (addedMembers.length > 0) {
      const inviter = await getUserPublicProfile(
        project.updatedBy || project.createdBy
      );

      const inviteTargetPreview = {
        name: project.name,
      } as EntityPreview;

      await handleAddMultipleMembersToEntity(
        addedMembers,
        projectId,
        EntityType.PROJECT,
        project.updatedBy || project.createdBy,
        inviteTargetPreview,
        inviter,
        projectRef
      );
    }

    return removedMembers.length > 0 || addedMembers.length > 0;
  } catch (error) {
    throw error;
  }
}
