import * as admin from "firebase-admin";

// Init admin, this needs to be done before importing the functions
// otherwise functions will complain about having multiple or no firebase admin
admin.initializeApp();

import {
  userCreationListener,
  userDeletionListener,
  userProfileListener,
} from "./userListeners";
import { groupListener } from "./groupListeners";
import { identifies } from "./analytics";

export {
  userProfileListener,
  userCreationListener,
  userDeletionListener,
  groupListener,
  identifies,
};
