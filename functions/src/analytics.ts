import * as functions from "firebase-functions";

import { AUDIT_LOG_EVENTS } from "./constants";
import { createAuditLogEvent } from "./services/auditLog";

export const identifies = functions.https.onCall(async (data, context) => {
  try {
    const { uid } = context.auth || {};
    if (!uid) {
      throw new Error("UNAUTHORIZED");
    }

    await createAuditLogEvent({
      event: AUDIT_LOG_EVENTS.USER_SIGNED_IN,
      userId: uid,
    });
  } catch (error) {
    throw error;
  }
});
