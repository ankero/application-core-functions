import * as functions from "firebase-functions";

import { DATABASE } from "./constants";
import { deleteInvitesForEntity } from "./services/invites";
import { EntityType, UserRoleNumbers, Project } from "./interfaces";
import { getPublicProfilesForMemberList } from "./services/entityMemberHandlers";
import {
  getProjectById,
  handleExistingProjectUpdated,
  handleNewProjectCreated,
  removeProjectMember,
  updateProject,
} from "./services/projects";

async function handleProjectError(
  entityId: string,
  project: Project,
  error: Error
): Promise<void> {
  console.error(`Unable to process project with projectId: ${entityId}`, error);

  try {
    await updateProject(entityId, {
      ...project,
      processingError: error.toString(),
    } as Project);
  } catch (recordErrorError) {
    console.error(
      `Unable to record error to project document with projectId: ${entityId}`
    );
    throw recordErrorError;
  }
}

export const onProjectCreate = functions.firestore
  .document(DATABASE.projects.documents.project)
  .onCreate(async (change, context) => {
    const { entityId } = context.params;
    const project = change.data() as Project;

    try {
      const { updatedMembers } = await handleNewProjectCreated(
        entityId,
        project,
        change.ref
      );
      const formattedMemberList = await getPublicProfilesForMemberList(
        project.members,
        project.formattedMemberList
      );

      await updateProject(entityId, {
        members: {
          ...project.members,
          ...updatedMembers,
        },
        formattedMemberList,
      });
    } catch (error) {
      await handleProjectError(entityId, project, error);
      throw error;
    }
  });

export const onProjectUpdate = functions.firestore
  .document(DATABASE.projects.documents.project)
  .onUpdate(async (change, context) => {
    const { entityId } = context.params;
    const project = change.after.data() as Project;
    const prevProject = change.before.data() as Project;

    try {
      const {
        hasChangesInMembers,
        updatedMembers,
      } = await handleExistingProjectUpdated(
        entityId,
        project,
        prevProject,
        change.after.ref
      );

      if (hasChangesInMembers) {
        const formattedMemberList = await getPublicProfilesForMemberList(
          project.members,
          project.formattedMemberList
        );

        await updateProject(entityId, {
          members: {
            ...project.members,
            ...updatedMembers,
          },
          formattedMemberList,
        });
      }
    } catch (error) {
      await handleProjectError(entityId, project, error);
      throw error;
    }
  });

export const onProjectDelete = functions.firestore
  .document(DATABASE.projects.documents.project)
  .onDelete(async (change, context) => {
    const { entityId } = context.params;

    try {
      await deleteInvitesForEntity(entityId, EntityType.PROJECT);
    } catch (error) {
      throw error;
    }
  });

export const leaveProject = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || ({} as any);

    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    const { projectId } = data;

    if (!projectId) {
      throw new Error("PROJECT ID MISSING");
    }

    // TODO
    const project = await getProjectById(projectId);

    if (!project) {
      throw new Error("Not found");
    }

    const userRole = project.members[uid];

    if (!userRole) {
      throw new Error("Not found");
    }

    if (userRole === UserRoleNumbers.OWNER) {
      throw new Error("Owners cannot remove self");
    }

    await removeProjectMember(projectId, project, uid);

    return { success: true };
  } catch (error) {
    throw error;
  }
});
