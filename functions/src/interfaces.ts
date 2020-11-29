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
  description?: string;
  photoUrl?: string;
}

export interface Invite {
  id?: string;
  inviteTargetId: string;
  inviteTargetType: InviteTargetType;
  inviteTargetPreview: InviteTargetPreview;
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
}

export interface ProfileItem {
  public: boolean;
  fieldKey: string;
}

export interface OldAndNewEntityMemberComparison {
  removedMembers: Array<any>;
  addedMembers: Array<any>;
}
