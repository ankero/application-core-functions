import * as admin from "firebase-admin";

// Init admin, this needs to be done before importing the functions
// otherwise functions will complain about having multiple or no firebase admin
admin.initializeApp();

import {
  onUserCreated,
  onUserDeleted,
  onUserUpdated,
  onUserClaimsChange,
  acceptPrivacyPolicy,
  downloadMyData,
} from "./users";
import {
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  updateGroupMembers,
  leaveGroup,
} from "./groups";
import {
  onProjectCreate,
  onProjectDelete,
  onProjectUpdate,
  updateProjectMembers,
  leaveProject,
} from "./projects";
import {
  onDocumentCreate,
  onDocumentUpdate,
  onDocumentDelete,
  reactToDocument,
  moveDocumentToNewParent,
} from "./documents";
import { identifies } from "./analytics";
import { onInvitationUpdate } from "./invitations";
import { onNotificationWrite, markAllNotificationsRead } from "./notifications";
export {
  identifies,
  onUserUpdated,
  onUserCreated,
  onUserDeleted,
  onUserClaimsChange,
  acceptPrivacyPolicy,
  downloadMyData,
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  updateGroupMembers,
  leaveGroup,
  onProjectCreate,
  onProjectDelete,
  onProjectUpdate,
  updateProjectMembers,
  leaveProject,
  onInvitationUpdate,
  onNotificationWrite,
  markAllNotificationsRead,
  onDocumentCreate,
  onDocumentUpdate,
  onDocumentDelete,
  reactToDocument,
  moveDocumentToNewParent,
};
