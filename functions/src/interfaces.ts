export enum InviteStatus {
  PENDING = "pending",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
}

export enum EntityType {
  GROUP = "group",
  INTIVE = "invite",
}

export enum NotificationEventType {
  GROUP_INVITE_ACCEPTED = "GROUP_INVITE_ACCEPTED",
  GROUP_INVITE_REJECTED = "GROUP_INVITE_REJECTED",
  USER_DATA_EXPORT_READY = "USER_DATA_EXPORT_READY",
  GROUP_INVITATION_RECEIVED = "GROUP_INVITATION_RECEIVED",
}

export enum UserIdentifierType {
  USERID = "userId",
  EMAIL = "email",
  NUMBER = "phoneNumber",
}

export enum UserRoleType {
  OWNER = "owner",
  EDITOR = "editor",
  MEMBER = "member",
  INVITED = "invited",
  REJECTED = "rejected",
}

export enum UserRoleNumbers {
  OWNER = 3,
  EDITOR = 2,
  MEMBER = 1,
  INVITED = 0,
}

export enum AuditLogEvents {
  USER_ACCOUNT_DELETED = "USER_ACCOUNT_DELETED",
  USER_ACCOUNT_CREATED = "USER_ACCOUNT_CREATED",
  USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED",
  USER_APPROVED_PRIVACY_POLICY = "USER_APPROVED_PRIVACY_POLICY",
  USER_REQUESTED_DATA_DOWNLOAD = "USER_REQUESTED_DATA_DOWNLOAD",
  USER_SIGNED_IN = "USER_SIGNED_IN",
}

export interface PublicUserProfile {
  id: string;
  publicName?: string;
  publicPhotoUrl?: string;
  role?: UserRoleType | null;
}

export interface EntityPreview {
  name: string;
  description?: string;
  photoUrl?: string;
}

export interface Invite {
  id?: string;
  inviteTargetId: string;
  inviteTargetType: EntityType;
  inviteTargetPreview: EntityPreview;
  inviteTargetRef: any;
  invitedBy: string;
  inviterProfile: User | null;
  invitedUserIdentifier: string;
  invitedUserIdentifierType: UserIdentifierType;
  invitedUserLiteral: string;
  inviteStatus: InviteStatus;
  error?: string;
}

export interface User {
  uid?: string;
  id?: string;
  email?: string;
  phoneNumber?: string;
  publicName?: string;
  publicPhotoUrl?: string;
  displayName?: string;
  photoURL?: string;
  createdAtMillis?: number;
  updatedAtMillis?: number;
}

export interface Group {
  id?: string;
  name: string;
  description?: string;
  createdBy: string;
  updatedBy?: string;
  members: Array<any>;
  formattedMemberList: Array<User>;
  processingError?: string | null;
}

export interface AuditLog {
  event: AuditLogEvents;
  entityId?: string;
}

export interface LogConfiguration {
  event: string;
  logAddress: string;
}

export interface ReferenceMap {
  collection: string;
  source: Array<string>;
  targetKey: string;
}

export interface ApplicationUserConfiguration {
  generateRandomNameOnCreate?: Boolean;
  generateRandomAvatarOnCreate?: Boolean;
  userFields: Array<ProfileItem>;
  publicProfileLinks: Array<ReferenceMap>;
}

export interface ApplicationLoggedInAppConfiguration {
  backgroundColor: string;
}

export interface ApplicationAuditLogConfiguration {
  auditLogEvents: Array<LogConfiguration>;
  gatherAuditLog: Boolean;
}

export interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

export interface OldAndNewEntityMemberComparison {
  removedMembers: Array<any>;
  addedMembers: Array<any>;
}

export interface Notification {
  id?: string;
  userId: string;
  read?: boolean;
  seen?: boolean;
  uri: string;
  referenceUserProfiles?: Array<PublicUserProfile>;
  referenceUserIds: Array<string>;
  referenceEntityId: string;
  referenceEntityType: EntityType;
  referenceEntityRef: any;
  referenceEntityUri?: string;
  referenceEntityPreview: EntityPreview;
  eventType: NotificationEventType;
  createdMillis?: number;
  readMillis?: number;
  seenMillis?: number;
}
