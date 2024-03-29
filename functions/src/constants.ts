/*
 * INSTRUCTIONS ON STORAGE & DATABASE
 * When referencing new indexes, please use the same type of structure as below.
 * This helps to keep the same type of approach and minimise any silly mistakes.
 */

import { EntityType } from "./interfaces";

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
      replicationConfiguration: "/application/replicationConfiguration",
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
      userDevices: "/users/{entityId}/devices/{deviceId}",
      userPredictions: "/users/{entityId}/predictions/predictions",
      userPermissions: "/users/{entityId}/permissions/memberships",
    },
    collections: {
      userPublicProfile: {
        collectionName: "/users/{entityId}/publicProfile/",
      },
      userAuditLogs: {
        collectionName: "/users/{entityId}/auditLog",
      },
      userDevices: {
        collectionName: "/users/{entityId}/devices",
      },
      userPredictions: {
        collectionName: "/users/{entityId}/predictions",
      },
      userPermissions: {
        collectionName: "/users/{entityId}/permissions",
      },
    },
  },
  groups: {
    collectionName: "groups",
    documents: {
      group: "/groups/{entityId}",
    },
  },
  documents: {
    collectionName: "documents",
    documents: {
      document: "/documents/{entityId}",
    },
  },
  projects: {
    collectionName: "projects",
    documents: {
      project: "/projects/{entityId}",
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

export const GROUP_COMPOSITE_ID_PREFIX = `${EntityType.GROUP}:`;
export const STORAGE_PREFIX = "storage:";
