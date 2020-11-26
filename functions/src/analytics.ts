import * as functions from "firebase-functions";

import { AuditLogEvents } from "./interfaces";
import { createAuditLogEvent } from "./services/auditLog";

export const identifies = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || {};
    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    await createAuditLogEvent({
      event: AuditLogEvents.USER_SIGNED_IN,
      entityId: uid,
    });
  } catch (error) {
    throw error;
  }
});
