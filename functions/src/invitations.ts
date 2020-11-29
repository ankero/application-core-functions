import * as functions from "firebase-functions";

import { DATABASE } from "./constants";
import { handleInvitationResponse } from "./services/invites";
import { Invite, InviteStatus } from "./interfaces";

export const onInvitationUpdate = functions.firestore
  .document(DATABASE.invites.documents.invite)
  .onUpdate(async (change, context) => {
    const { entityId } = context.params;
    const invite = change.after.data() as Invite;
    const prevInvite = change.before.data() as Invite;

    try {
      const inviteStatusChange =
        invite?.inviteStatus !== prevInvite?.inviteStatus;
      const inviteIsPending = invite?.inviteStatus === InviteStatus.PENDING;
      if (!inviteStatusChange || inviteIsPending) {
        return;
      }
      await handleInvitationResponse(entityId, invite);
    } catch (error) {
      throw error;
    }
  });
