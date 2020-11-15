import * as admin from "firebase-admin";
import { DATABASE_ADDRESSES } from "../constants";
import { getApplicationPrivateConfiguration } from "./application";

// database
const db = admin.firestore();

interface AuditLog {
  event: string;
  userId?: string;
}

interface LogConfiguration {
  event: string;
  logTarget: string;
}

function getLogEventConfiguration(
  { event }: any,
  logConfiguration: Array<AuditLog>
): LogConfiguration {
  return logConfiguration.find(
    (conf) => conf.event === event
  ) as LogConfiguration;
}

function getLogAddress({ logTarget }: any, { userId }: any) {
  const logName = `log_${Date.now()}`;
  let address;

  if (logTarget === "user") {
    if (!userId) {
      throw new Error("Missing userId from AuditLog");
    }
    address = DATABASE_ADDRESSES.userAuditLog
      .replace("{userId}", userId || "")
      .replace("{logId}", logName);
  } else if (logTarget === "application") {
    address = DATABASE_ADDRESSES.applicationAuditLog.replace(
      "{logId}",
      logName
    );
  } else {
    throw new Error(
      `Invalid logTarget: ${logTarget}. Please add handler to auditLog.ts.`
    );
  }
  return address;
}

export async function createAuditLogEvent(data: AuditLog): Promise<void> {
  try {
    const configuration = await getApplicationPrivateConfiguration();
    const logConfiguration = configuration.auditLogEvents;

    const eventConfiguration = getLogEventConfiguration(data, logConfiguration);

    if (!eventConfiguration) {
      console.log(
        `Logs not enabled for event ${data.event}. If this is not intended, please add configuration to /application/PRIVATE_CONFIGURATION/auditLogEvents<Array>{event, label, logTarget}`
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
