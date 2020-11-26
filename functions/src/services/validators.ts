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
  return value.replace(/\./g, "\\.");
};
