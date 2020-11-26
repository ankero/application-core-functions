import * as functions from "firebase-functions";

import { DATABASE_ADDRESSES } from "./constants";
import { handleInvitationResponse } from "./services/invites";
import { Invite, InviteStatus } from "./interfaces";

export const invitationListener = functions.firestore
  .document(DATABASE_ADDRESSES.invite)
  .onUpdate(async (change, context) => {
    const { inviteId } = context.params;
    const invite = change.after.exists ? (change.after.data() as Invite) : null;
    const prevInvite = change.before.exists
      ? (change.before.data() as Invite)
      : null;

    if (!invite || !prevInvite) {
      return;
    }

    try {
      const inviteStatusChange =
        invite?.inviteStatus !== prevInvite?.inviteStatus;
      const inviteIsPending = invite?.inviteStatus === InviteStatus.PENDING;
      if (!inviteStatusChange || inviteIsPending) {
        return;
      }
      await handleInvitationResponse(inviteId, invite);
    } catch (error) {
      throw error;
    }
  });
