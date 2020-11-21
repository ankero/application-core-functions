export const AUDIT_LOG_EVENTS = {
  USER_ACCOUNT_DELETED: "USER_ACCOUNT_DELETED",
  USER_ACCOUNT_CREATED: "USER_ACCOUNT_CREATED",
  USER_PROFILE_UPDATED: "USER_PROFILE_UPDATED",
  USER_SIGNED_IN: "USER_SIGNED_IN",
};
export const DATABASE_COLLECTIONS = {
  users: "users",
  groups: "groups",
};
export const DATABASE_ADDRESSES = {
  applicationUserConfiguration: "/application/USER_CONFIGURATION",
  applicationPrivateConfiguration: "/application/PRIVATE_CONFIGURATION",
  applicationAuditLogConfiguration: "/application/AUDIT_LOG",
  user: "/users/{userId}",
  userPublicProfile: "/users/{userId}/PUBLIC_PROFILE/profile",
  group: "/groups/{groupId}",
};
export const STORAGE_ADDRESSES = {
  userPublicFiles: "users/{userId}/PUBLIC/",
  userPrivateFiles: "users/{userId}/PRIVATE/",
};
