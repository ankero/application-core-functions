import * as functions from "firebase-functions";
import { DATABASE } from "./constants";
import { Document, UserRoleNumbers } from "./interfaces";

import {
  addChildToDocument,
  removeChildFromDocument,
  react,
  addTagsToChildren,
  deleteChildDocuments,
  moveDocumentParent,
} from "./services/documents";
import { getProjectById } from "./services/projects";
import { deleteDocumentFiles } from "./services/storage";

export const onDocumentCreate = functions.firestore
  .document(DATABASE.documents.documents.document)
  .onCreate(async (change, context) => {
    const { entityId } = context.params;
    const document = change.data() as Document;

    try {
      await addTagsToChildren(document, null);
      await addChildToDocument({
        ...document,
        id: entityId,
      });
    } catch (error) {
      throw error;
    }
  });

export const onDocumentUpdate = functions.firestore
  .document(DATABASE.documents.documents.document)
  .onUpdate(async (change, context) => {
    const { entityId } = context.params;
    const document = change.after.data() as Document;
    const prevDocument = change.before.data() as Document;

    try {
      await addTagsToChildren(document, prevDocument);
      await addChildToDocument({
        ...document,
        id: entityId,
      });
    } catch (error) {
      throw error;
    }
  });

export const onDocumentDelete = functions.firestore
  .document(DATABASE.documents.documents.document)
  .onDelete(async (change, context) => {
    const { entityId } = context.params;
    const document = change.data() as Document;

    try {
      await removeChildFromDocument({
        ...document,
        id: entityId,
      });
      await deleteChildDocuments({ ...document, id: entityId });
      await deleteDocumentFiles({ ...document, id: entityId });
    } catch (error) {
      throw error;
    }
  });

export const reactToDocument = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || {};
    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    const { documentId, reaction } = data;
    if (!documentId) {
      throw new Error("UNAUTHORIZED");
    }

    await react(documentId, uid, reaction);
  } catch (error) {
    throw error;
  }
});

export const moveDocumentToNewParent = functions.https.onCall(
  async (data, context) => {
    try {
      const { uid } = context.auth || {};
      if (!uid) {
        throw new Error("UNAUTHORIZED");
      }

      const { projectId, moved, start, end } = data;
      if (!projectId || !moved || !start || !end) {
        throw new Error("UNAUTHORIZED");
      }

      const project = await getProjectById(projectId);

      if (!project) {
        // This is really "not found" but we don't want to expose this
        // info to potential hackers
        throw new Error("UNAUTHORIZED");
      }

      const userRole = project.members[uid];

      if (!userRole) {
        throw new Error("UNAUTHORIZED");
      }

      if (userRole < UserRoleNumbers.MEMBER) {
        throw new Error("UNAUTHORIZED");
      }

      await moveDocumentParent(projectId, moved, start, end);
    } catch (error) {
      throw error;
    }
  }
);
