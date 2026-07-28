import { parsePhoneNumber } from "awesome-phonenumber";

const validateMobileNumber = (phone: string): boolean => {
  const pn = parsePhoneNumber(phone);
  return pn.valid;
};

export default validateMobileNumber;
