# Application Core

This project is designed to answer a need to quickly kick off a scalable semi-prod ready application. The motivation behind this is the experience of all the "necessary evil" stuff that we developers need to take into account when starting a new project. So instead of focusing on those, I wanted to build something that lets you, me, anyone to focus on the actual business logic and the problem to be solved.

Please check the companion repo for overall details about this project.

## Main functionalities

Below is the list of main functionalities and processes.

## Users

### onUserCreated

- Populates user private and public profile.
- Claims any outstanding invites for the user based on email or phone number

### onUserDeleted

- Deletes user public profile, audit log and profile
- Deletes user uploaded images

### onUserUpdated

- Updates user public profile
- Updates references which include user public profile. Please see about reference updates below.

### acceptPrivacyPolicy

- Accepts privacy policy for the user. I wanted to do this with a separate function and protect the fields with the security rules.

## Analytics

### Identifies

- Records signed in event to audit log
- Could be used for analytics.. kind of a placeholder for that

## Groups

### onGroupCreate

- Sends invites and sets profiles to group

### onGroupDelete

- Deletes invites

### onGroupUpdate

- Removes users if needed
- Cancels invites if needed
- Sends more invites if needed

### leaveGroup

- Removes self from group

## Invitations

### onInvitationUpdate

- On reject: Removes user from the referred entity members list
- On accept: Adds users uid to referred entity members list & removes placeholder

## About reference updates

There's a handy background process that can be initiated. It copies the given data, such as user public profile to places where it may be referred to. For example, when user updates their name, we want to update their name in the group listing.

The process checks the database `/application/userConfiguration` and from here the `publicProfileLinks` -array. By using this array, the function queries the database and updates the references with the new profile data.
