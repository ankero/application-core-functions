export enum InviteStatus {
  PENDING = "pending",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
}

export enum InviteTargetType {
  GROUP = "group",
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
  REJECTED = 99,
}

export enum AuditLogEvents {
  USER_ACCOUNT_DELETED = "USER_ACCOUNT_DELETED",
  USER_ACCOUNT_CREATED = "USER_ACCOUNT_CREATED",
  USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED",
  USER_SIGNED_IN = "USER_SIGNED_IN",
}

export interface PublicUserProfile {
  id: string;
  publicName?: string;
  publicPhotoUrl?: string;
  role?: UserRoleType | null;
}

export interface InviteTargetPreview {
  name: string;
  inviterPublicName: string;
  inviterPublicPhotoUrl?: string;
}

export interface Invite {
  id?: string;
  inviteTargetId: string;
  inviteTargetType: InviteTargetType;
  inviteTargetPreview: InviteTargetPreview;
  inviteTargetRef: any;
  invitedBy: string;
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
  name: string;
  description?: string;
  createdBy: string;
  updatedBy?: string;
  members: Array<string>;
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

export interface ApplicationUserConfiguration {
  userFields: Array<ProfileItem>;
}

export interface ApplicationLoggedInAppConfiguration {
  backgroundColor: string;
}

export interface ApplicationAuditLogConfiguration {
  auditLogEvents: Array<LogConfiguration>;
}

export interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

export interface OldAndNewEntityMemberComparison {
  removedMembers: Array<any>;
  addedMembers: Array<any>;
}
