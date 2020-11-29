import * as admin from "firebase-admin";

// Init admin, this needs to be done before importing the functions
// otherwise functions will complain about having multiple or no firebase admin
admin.initializeApp();

import {
  onUserCreated,
  onUserDeleted,
  onUserUpdated,
  acceptPrivacyPolicy,
} from "./users";
import {
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  leaveGroup,
} from "./groups";
import { identifies } from "./analytics";
import { onInvitationUpdate } from "./invitations";

export {
  identifies,
  onUserUpdated,
  onUserCreated,
  onUserDeleted,
  acceptPrivacyPolicy,
  onGroupCreate,
  onGroupDelete,
  onGroupUpdate,
  leaveGroup,
  onInvitationUpdate,
};
