import * as admin from "firebase-admin";
import { DATABASE } from "../constants";
import {
  ApplicationUserConfiguration,
  ApplicationLoggedInAppConfiguration,
  ApplicationAuditLogConfiguration,
  ApplicationReplicationConfiguration,
} from "../interfaces";
// database
const db = admin.firestore();

// TypeScript Interfaces

export async function getApplicationReplicationConfiguration(): Promise<ApplicationReplicationConfiguration> {
  try {
    const doc = await db
      .doc(DATABASE.application.documents.replicationConfiguration)
      .get();

    if (!doc.exists) {
      console.warn("Document does not exist.");
      return {};
    }
    return (doc.data() as ApplicationReplicationConfiguration) || {};
  } catch (error) {
    throw Error(error);
  }
}

export async function getApplicationUserConfiguration(): Promise<ApplicationUserConfiguration> {
  try {
    const doc = await db
      .doc(DATABASE.application.documents.userConfiguration)
      .get();
    const empty = { userFields: [], publicProfileLinks: [] };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationUserConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}

export async function getApplicationLoggedInAppConfiguration(): Promise<ApplicationLoggedInAppConfiguration> {
  try {
    const doc = await db
      .doc(DATABASE.application.documents.loggedInAppConfiguration)
      .get();
    const empty = { backgroundColor: "" };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationLoggedInAppConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}

export async function getApplicationAuditLogConfiguration(): Promise<ApplicationAuditLogConfiguration> {
  try {
    const doc = await db
      .doc(DATABASE.application.documents.auditLogConfiguration)
      .get();
    const empty = { auditLogEvents: [], gatherAuditLog: false };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationAuditLogConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}
