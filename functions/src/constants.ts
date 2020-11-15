export const AUDIT_LOG_EVENTS = {
  USER_ACCOUNT_DELETED: "USER_ACCOUNT_DELETED",
  USER_ACCOUNT_CREATED: "USER_ACCOUNT_CREATED",
  USER_PROFILE_UPDATED: "USER_PROFILE_UPDATED",
};
export const DATABASE_ADDRESSES = {
  applicationUserConfiguration: "/application/USER_CONFIGURATION",
  applicationPrivateConfiguration: "/application/PRIVATE_CONFIGURATION",
  applicationAuditLog: "/application/AUDIT_LOG/AUDIT_LOG/{logId}",
  user: "/users/{userId}",
  userAuditLog: "/users/{userId}/AUDIT_LOG/{logId}",
  userPublicProfile: "/users/{userId}/PUBLIC_PROFILE/profile",
};
export const STORAGE_ADDRESSES = {
  userPublicFiles: "users/{userId}/PUBLIC/",
  userPrivateFiles: "users/{userId}/PRIVATE/",
};
