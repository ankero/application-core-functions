import * as functions from "firebase-functions";
import { DATABASE } from "./constants";
import { Document, DocumentType } from "./interfaces";

import {
  addChildToDocument,
  removeChildFromDocument,
  react,
} from "./services/documents";

export const onDocumentCreate = functions.firestore
  .document(DATABASE.documents.documents.document)
  .onCreate(async (change, context) => {
    const { entityId } = context.params;
    const document = change.data() as Document;

    try {
      if (document.type !== DocumentType.COMMENT) {
        return;
      }

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
    // const { entityId } = context.params;
    // const document = change.after.data() as Document;
    try {
      // Do nothing
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
      if (document.type !== DocumentType.COMMENT) {
        return;
      }

      await removeChildFromDocument({
        ...document,
        id: entityId,
      });
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
    console.log(`Got data: ${documentId}, ${reaction}`);
    if (!documentId) {
      console.log("Threw in top");
      throw new Error("UNAUTHORIZED");
    }

    await react(documentId, uid, reaction);
  } catch (error) {
    throw error;
  }
});
