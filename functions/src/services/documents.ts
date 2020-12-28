import * as admin from "firebase-admin";
import isEqual = require("lodash.isequal");
import uniq = require("lodash.uniq");
import { DATABASE } from "../constants";
import { Document, DocumentType, Reaction } from "../interfaces";
import { isInMembers } from "./entityMemberHandlers";
import { getProjectById } from "./projects";

// database
const db = admin.firestore();

export async function updateDocument(
  documentId: string,
  data: Document | any
): Promise<void> {
  try {
    await db
      .doc(
        DATABASE.documents.documents.document.replace("{entityId}", documentId)
      )
      .set({ ...data }, { merge: true });
  } catch (error) {
    throw error;
  }
}

export async function getDocument(
  documentId: string
): Promise<Document | null> {
  try {
    const doc = await db
      .doc(
        DATABASE.documents.documents.document.replace("{entityId}", documentId)
      )
      .get();

    if (!doc.exists) {
      throw Error("NOT FOUND");
    }

    return {
      ...doc.data(),
      id: doc.id,
      ref: doc.ref,
    } as Document;
  } catch (error) {
    throw error;
  }
}

export async function react(
  documentId: string,
  userId: string,
  reaction: string
): Promise<void> {
  try {
    const document = await getDocument(documentId);
    if (!document) {
      throw Error("NOT FOUND");
    }

    const project = await getProjectById(document.projectId);
    if (!project) {
      throw Error("NOT FOUND");
    }

    if (!isInMembers(project.members, userId)) {
      throw new Error("UNAUTHORIZED");
    }

    const reactionAddress = `reactions.${userId}`;
    if (reaction) {
      const newReaction = {
        userId,
        reaction,
        updatedMillis: Date.now(),
      } as Reaction;

      await document.ref.update({
        [reactionAddress]: newReaction,
      });
    } else {
      await document.ref.update({
        [reactionAddress]: admin.firestore.FieldValue.delete(),
      });
    }
  } catch (error) {
    throw error;
  }
}

export async function addTagsToChildren(
  document: Document,
  prevDocument: Document | null
): Promise<void> {
  try {
    const { tags = [], children = [], ancestors = [], type } = document;
    // Ignore task that have too few ancestors.
    // This means that the task is either the board OR a collection of tasks
    if (type === DocumentType.TASK && ancestors.length < 2) return;
    if (children.length === 0) return;
    if (prevDocument && isEqual(tags, prevDocument.tags)) return;

    await db.runTransaction(async (t) => {
      document.children.forEach((childId) => {
        t.update(
          db.doc(
            DATABASE.documents.documents.document.replace("{entityId}", childId)
          ),
          { tags }
        );
      });
    });
  } catch (error) {
    throw error;
  }
}

export async function addChildToDocument(document: Document): Promise<void> {
  try {
    if (!document.ancestors || document.ancestors.length === 0) {
      console.log("[ADD] No ancestors");
      return;
    }
    const nearestAncestorId = document.ancestors[document.ancestors.length - 1];
    await db
      .doc(
        DATABASE.documents.documents.document.replace(
          "{entityId}",
          nearestAncestorId
        )
      )
      .update({
        children: admin.firestore.FieldValue.arrayUnion(document.id),
      });
  } catch (error) {
    throw error;
  }
}

export async function removeChildFromDocument(
  document: Document
): Promise<void> {
  try {
    const { ancestors = [] } = document;
    if (ancestors.length === 0) {
      console.log("[DELETE] No ancestors");
      return;
    }

    const nearestAncestorId = ancestors[ancestors.length - 1];
    await db
      .doc(
        DATABASE.documents.documents.document.replace(
          "{entityId}",
          nearestAncestorId
        )
      )
      .update({
        children: admin.firestore.FieldValue.arrayRemove(document.id),
      });
  } catch (error) {
    throw error;
  }
}

export async function deleteChildDocuments(document: Document): Promise<void> {
  try {
    const { children = [] } = document;
    if (children.length === 0) {
      console.log("[DELETE] No children to delete");
      return;
    }

    await db.runTransaction(async (t) => {
      children.forEach((childId) => {
        t.delete(
          db.doc(
            DATABASE.documents.documents.document.replace("{entityId}", childId)
          )
        );
      });
    });
  } catch (error) {
    throw error;
  }
}

export async function moveDocumentParent(
  projectId: string,
  moved: any,
  start: any,
  end: any
): Promise<void> {
  try {
    if (
      !moved.id ||
      !moved.ancestors ||
      !start.id ||
      !start.children ||
      !end.id ||
      !end.children
    ) {
      console.warn(
        `Invalid data: ${JSON.stringify(moved)} - ${JSON.stringify(
          start
        )} - ${JSON.stringify(end)}`
      );
      throw new Error("Invalid data");
    }

    // Validate documents to move
    const movedDoc = await getDocument(moved.id);
    const startDoc = await getDocument(start.id);
    const endDoc = await getDocument(end.id);

    if (!movedDoc || !startDoc || !endDoc) {
      console.warn(
        `Missing document: ${JSON.stringify(movedDoc)} - ${JSON.stringify(
          startDoc
        )} - ${JSON.stringify(endDoc)}`
      );
      throw new Error("Invalid data");
    }

    if (
      movedDoc.projectId !== projectId ||
      startDoc.projectId !== projectId ||
      endDoc.projectId !== projectId
    ) {
      console.warn(
        `Invalid projectId: ${JSON.stringify(movedDoc)} - ${JSON.stringify(
          startDoc
        )} - ${JSON.stringify(endDoc)}`
      );
      throw new Error("Trying to move doc between projects");
    }

    console.log(
      `REQ: ${JSON.stringify(moved)} - ${JSON.stringify(
        start
      )} - ${JSON.stringify(end)}`
    );

    // Validate move-data
    let uniqStartChildren = uniq(start.children);
    const uniqEndChildren = uniq(end.children);

    if (
      uniqEndChildren.length !== end.children.length ||
      uniqStartChildren.length !== start.children.length
    ) {
      console.warn("Child lists were not unique, making them so.");
    }

    if (uniqStartChildren.find((id) => uniqEndChildren.includes(id))) {
      const duplicatIds = uniqStartChildren.filter((id) =>
        uniqEndChildren.includes(id)
      );
      console.warn(
        `Same id in multiple parents (${JSON.stringify(
          duplicatIds
        )}). Removing from start doc and defaultting only parent to endChildren.`
      );
      uniqStartChildren = uniqStartChildren.filter((id) =>
        uniqEndChildren.includes(id)
      );
    }

    // Update all inside a transaction
    await db.runTransaction(async (t) => {
      console.log(
        `UPDATE: ${JSON.stringify({
          ancestors: moved.ancestors,
        })} - ${JSON.stringify({
          children: uniqStartChildren,
        })} - ${JSON.stringify({ children: uniqEndChildren })}`
      );
      t.update(
        db.doc(
          DATABASE.documents.documents.document.replace("{entityId}", moved.id)
        ),
        { ancestors: moved.ancestors }
      );
      t.update(
        db.doc(
          DATABASE.documents.documents.document.replace("{entityId}", start.id)
        ),
        { children: uniqStartChildren }
      );
      t.update(
        db.doc(
          DATABASE.documents.documents.document.replace("{entityId}", end.id)
        ),
        { children: uniqEndChildren }
      );
    });
  } catch (error) {
    throw error;
  }
}
