import * as admin from "firebase-admin";

// Init admin, this needs to be done before importing the functions
// otherwise functions will complain about having multiple or no firebase admin
admin.initializeApp();

import {
  onUserCreated,
  onUserDeleted,
  onUserUpdated,
  acceptPrivacyPolicy,
  downloadMyData,
} from "./users";
import {
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  leaveGroup,
} from "./groups";
import {
  onProjectCreate,
  onProjectDelete,
  onProjectUpdate,
  leaveProject,
} from "./projects";
import { identifies } from "./analytics";
import { onInvitationUpdate } from "./invitations";
import { onNotificationWrite, markAllNotificationsRead } from "./notifications";
export {
  identifies,
  onUserUpdated,
  onUserCreated,
  onUserDeleted,
  acceptPrivacyPolicy,
  downloadMyData,
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  leaveGroup,
  onProjectCreate,
  onProjectDelete,
  onProjectUpdate,
  leaveProject,
  onInvitationUpdate,
  onNotificationWrite,
  markAllNotificationsRead,
};
