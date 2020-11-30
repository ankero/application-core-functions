/*
 * INSTRUCTIONS ON STORAGE & DATABASE
 * When referencing new indexes, please use the same type of structure as below.
 * This helps to keep the same type of approach and minimise any silly mistakes.
 */

export const STORAGE = {
  userPublicFiles: "users/{entityId}/PUBLIC/",
  userPrivateFiles: "users/{entityId}/PRIVATE/",
};
export const DATABASE = {
  application: {
    collectionName: "application",
    documents: {
      publicAppConfiguration: "/application/publicAppConfiguration",
      userConfiguration: "/application/userConfiguration",
      loggedInAppConfiguration: "/application/loggedInAppConfiguration",
      auditLogConfiguration: "/application/auditLogConfiguration",
    },
  },
  auditLog: {
    collectionName: "auditLog",
    documents: {
      log: "/auditLog/{logId}",
    },
  },
  users: {
    collectionName: "users",
    documents: {
      user: "/users/{entityId}",
      userPublicProfile: "/users/{entityId}/publicProfile/profile",
      userAuditLogs: "/users/{entityId}/publicProfile/{logId}",
    },
    collections: {
      userAuditLogs: {
        collectionName: "/users/{entityId}/auditLog",
      },
    },
  },
  groups: {
    collectionName: "groups",
    documents: {
      group: "/groups/{entityId}",
    },
  },
  invites: {
    collectionName: "invites",
    documents: {
      invite: "/invites/{entityId}",
    },
  },
  notifications: {
    collectionName: "notifications",
    documents: {
      notification: "/notifications/{entityId}",
    },
  },
};
