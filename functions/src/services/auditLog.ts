import * as admin from "firebase-admin";
import { getApplicationAuditLogConfiguration } from "./application";
import { AuditLog, LogConfiguration } from "../interfaces";

// database
const db = admin.firestore();

async function getLogEventConfiguration({
  event,
}: any): Promise<LogConfiguration | null> {
  try {
    const auditLogConfiguration = await getApplicationAuditLogConfiguration();
    const logConfiguration = auditLogConfiguration.auditLogEvents;
    if (!logConfiguration) return null;

    return logConfiguration.find(
      (conf) => conf.event === event
    ) as LogConfiguration;
  } catch (error) {
    throw error;
  }
}

function getLogAddress({ logAddress }: LogConfiguration, { entityId }: any) {
  const logName = `log_${Date.now()}`;
  return logAddress
    .replace("{entityId}", entityId || "")
    .replace("{logId}", logName);
}

export async function createAuditLogEvent(data: AuditLog): Promise<void> {
  try {
    const eventConfiguration = await getLogEventConfiguration(data);

    if (!eventConfiguration) {
      console.log(
        `Logs not enabled for event ${data.event}. If this is not intended, please add configuration to /application/AUDIT_LOG/auditLogEvents<Array>{event, label, logAddress}`
      );
      return;
    }

    const address = getLogAddress(eventConfiguration, data);

    await db.doc(address).set({
      timestamp: Date.now(),
      ...data,
    });
  } catch (error) {
    throw Error(error);
  }
}
