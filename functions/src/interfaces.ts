export enum InviteStatus {
  PENDING = "pending",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
}

export enum InviteTargetType {
  GROUP = "group",
}

export enum UserIdentifierType {
  USERID = "userId",
  EMAIL = "email",
  NUMBER = "phoneNumber",
}

export interface PublicUserProfile {
  id: string;
  publicName?: string;
  publicPhotoUrl?: string;
}

export interface Invite {
  id?: string;
  inviteTargetId: string;
  inviteTargetType: InviteTargetType;
  invitedBy: PublicUserProfile;
  invitedUserIdentifier: string;
  invitedUserIdentifierType: UserIdentifierType;
  invitedUserLiteral: string;
  inviteStatus: InviteStatus;
}

export interface User {
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
  createdBy: string;
  members: Array<string>;
  editors: Array<string>;
  formattedMemberList: Array<User>;
  addMembers?: Array<string> | any;
  removeMembers?: Array<string> | any;
  processed: Boolean;
  processingError?: string | null;
}

export interface AuditLog {
  event: string;
  userId?: string;
}

export interface LogConfiguration {
  event: string;
  logAddress: string;
}

export interface ApplicationUserConfiguration {
  userFields: Array<ProfileItem>;
}

export interface ApplicationPrivateConfiguration {
  backgroundColor: string;
}

export interface ApplicationAuditLogConfiguration {
  auditLogEvents: Array<LogConfiguration>;
}

export interface ProfileItem {
  public: boolean;
  fieldKey: string;
}
