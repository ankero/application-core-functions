import { MembershipObject, UserRoleNumbers } from "../interfaces";

export const isEmailOrNumber = (emailOrNumber: string): any => {
  if (validateEmail(emailOrNumber)) return { email: emailOrNumber };
  else if (validateNumber(emailOrNumber)) return { number: emailOrNumber };
  else {
    return {};
  }
};

export const validateEmail = (email: string): boolean => {
  // eslint-disable-next-line
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validateNumber = (number: string): boolean => {
  const noSpaces = number.replace(/\s/g, "");
  // eslint-disable-next-line
  const re = /[0-9-()]*[1-9][0-9-()]*/;
  return re.test(noSpaces);
};

export const escapeDotAddress = (value: string) => {
  return `\`${value.replace(/\./g, "\\.")}\``;
};

export const validateNoInvitePromotees = (
  newMembers: MembershipObject,
  oldMembers: MembershipObject
) => {
  Object.keys(oldMembers).forEach((memberId: any) => {
    if (
      newMembers[memberId] > oldMembers[memberId] &&
      oldMembers[memberId] === UserRoleNumbers.INVITED
    ) {
      throw new Error("Cannot promote user who is still an invitee");
    }
  });
};

export const getValidMemberObject = (
  entityId: string,
  members: MembershipObject
): MembershipObject => {
  let ownerId = null as any;
  const validMembersObject = {} as MembershipObject;

  Object.keys(members).forEach((memberId) => {
    const roleNumber = members[memberId];
    if (ownerId && roleNumber === UserRoleNumbers.OWNER) {
      throw Error("Only one owner allowed");
    }
    if (roleNumber === UserRoleNumbers.OWNER) {
      ownerId = memberId;
    }
    if (
      typeof roleNumber === "number" &&
      roleNumber >= UserRoleNumbers.INVITED &&
      roleNumber <= UserRoleNumbers.OWNER
    ) {
      validMembersObject[memberId] = roleNumber;
    }
  });

  if (Object.keys(validMembersObject).length === 0) {
    throw new Error("Invalid members object");
  }

  if (Object.keys(validMembersObject).length !== Object.keys(members).length) {
    console.info(
      `Incoming member data has invalid inputs. EntityId: ${entityId}, incoming data: ${JSON.stringify(
        members
      )}, valid data: ${JSON.stringify(validMembersObject)}`
    );
  }
  return validMembersObject;
};
