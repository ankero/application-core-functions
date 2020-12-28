import * as admin from "firebase-admin";

export enum InviteStatus {
  PENDING = "pending",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
}

export enum EntityType {
  GROUP = "group",
  INTIVE = "invite",
  PROJECT = "project",
}

export enum DocumentType {
  TASK = "TASK",
  COMMENT = "COMMENT",
  FILE = "FILE",
}

export enum NotificationEventType {
  INVITATION_RECEIVED = "INVITATION_RECEIVED",
  INVITE_ACCEPTED = "INVITE_ACCEPTED",
  INVITE_REJECTED = "INVITE_REJECTED",
  USER_DATA_EXPORT_READY = "USER_DATA_EXPORT_READY",
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
export interface MembershipObject {
  [id: string]: UserRoleNumbers | admin.firestore.FieldValue;
}

export interface Tag {
  key: string;
  label: string;
}

export interface PublicUserProfile {
  id: string;
  entityType?: EntityType;
  publicName?: string;
  publicPhotoUrl?: string;
  role?: UserRoleType | null;
  members?: MembershipObject;
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
  inviteTargetRef: admin.firestore.DocumentReference;
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

export interface Project {
  id?: string;
  name: string;
  description?: string;
  theme?: string;
  createdBy: string;
  updatedBy?: string;
  members: MembershipObject;
  formattedMemberList: Array<PublicUserProfile>;
  processingError?: string | null;
  ref: admin.firestore.DocumentReference;
}

export interface Group {
  id?: string;
  name: string;
  description?: string;
  createdBy: string;
  updatedBy?: string;
  members: MembershipObject;
  formattedMemberList: Array<PublicUserProfile>;
  processingError?: string | null;
  ref: admin.firestore.DocumentReference;
}

export interface Reaction {
  userId: string;
  reaction: string;
  updatedMillis: number;
}

export interface Document {
  id?: string;
  title?: string;
  content?: string;
  createdBy: string;
  updatedBy?: string;
  url?: string;
  projectId: string;
  type: DocumentType;
  children: Array<string>;
  ancestors: Array<string>;
  tags: Array<Tag>;
  reactions: Array<Reaction>;
  author?: PublicUserProfile;
  processingError?: string | null;
  ref: admin.firestore.DocumentReference;
}

export interface UserPermissions {
  [key: string]: boolean | number;
}

export interface AuditLog {
  event: AuditLogEvents;
  entityId?: string;
}

export interface LogConfiguration {
  event: string;
  logAddress: string;
}

export interface ReplicationConfigurationItem {
  collection: string;
  targetKey: string;
  source: Array<string | number | any>;
  inheritMembers?: boolean;
  deleteReferencesOnDelete?: boolean;
}

export interface ApplicationReplicationConfiguration {
  users?: Array<ReplicationConfigurationItem>;
  groups?: Array<ReplicationConfigurationItem>;
}

export interface ApplicationUserConfiguration {
  generateRandomNameOnCreate?: Boolean;
  generateRandomAvatarOnCreate?: Boolean;
  userFields: Array<ProfileItem>;
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
  removedMembers: MembershipObject;
  addedMembers: MembershipObject;
  updatedPermissions: MembershipObject;
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
  referenceEntityRef: admin.firestore.DocumentReference;
  referenceEntityUri?: string;
  referenceEntityPreview: EntityPreview;
  eventType: NotificationEventType;
  createdMillis?: number;
  readMillis?: number;
  seenMillis?: number;
}
