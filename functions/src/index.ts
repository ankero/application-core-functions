import * as admin from "firebase-admin";

// Init admin, this needs to be done before importing the functions
// otherwise functions will complain about having multiple or no firebase admin
admin.initializeApp();

import { userProfileListener } from "./userProfileListener";
import { userCreationListener } from "./userListener";

export { userProfileListener, userCreationListener };
