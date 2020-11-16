import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";

// database
const db = admin.firestore();

// TypeScript Interfaces
interface ApplicationUserConfiguration {
  userFields: Array<ProfileItem>;
}

interface ApplicationPrivateConfiguration {
  backgroundColor: string;
}

interface ApplicationAuditLogConfiguration {
  auditLogEvents: Array<LogConfiguration>;
}

interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

interface LogConfiguration {
  event: string;
  logAddress: string;
}

export async function getApplicationUserConfiguration(): Promise<
  ApplicationUserConfiguration
> {
  try {
    const doc = await db
      .doc(DATABASE_ADDRESSES.applicationUserConfiguration)
      .get();
    const empty = { userFields: [] };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationUserConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}

export async function getApplicationPrivateConfiguration(): Promise<
  ApplicationPrivateConfiguration
> {
  try {
    const doc = await db
      .doc(DATABASE_ADDRESSES.applicationPrivateConfiguration)
      .get();
    const empty = { backgroundColor: "" };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationPrivateConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}

export async function getApplicationAuditLogConfiguration(): Promise<
  ApplicationAuditLogConfiguration
> {
  try {
    const doc = await db
      .doc(DATABASE_ADDRESSES.applicationAuditLogConfiguration)
      .get();
    const empty = { auditLogEvents: [] };
    if (!doc.exists) {
      console.warn("Document does not exist.");
      return empty;
    }
    return (doc.data() as ApplicationAuditLogConfiguration) || empty;
  } catch (error) {
    throw Error(error);
  }
}