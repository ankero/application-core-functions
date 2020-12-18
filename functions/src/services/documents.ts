import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import { Document, Reaction } from "../interfaces";
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

export async function addChildToDocument(document: Document): Promise<void> {
  try {
    if (!document.ancestors || document.ancestors.length === 0) {
      console.log("[ADD] No ancestors");
      return;
    }

    const nearestAncestorId = document.ancestors[document.ancestors.length - 1];

    const parentDoc = await getDocument(nearestAncestorId);
    if (!parentDoc) {
      throw Error("NOT FOUND");
    }
    console.log(`[ADD] Found ancestor > ${nearestAncestorId}`);
    await parentDoc.ref.update({
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
    if (!document.ancestors || document.ancestors.length === 0) {
      console.log("[DELETE] No ancestors");
      return;
    }

    const nearestAncestorId = document.ancestors[document.ancestors.length - 1];

    const parentDoc = await getDocument(nearestAncestorId);
    if (!parentDoc) {
      throw Error("NOT FOUND");
    }

    await parentDoc.ref.update({
      children: admin.firestore.FieldValue.arrayRemove(document.id),
    });
  } catch (error) {
    throw error;
  }
}
