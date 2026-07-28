const validatePassword = (password: string): boolean => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!#$%^&*()\-_=+.,?])[A-Za-z\d@!#$%^&*()\-_=+.,?]+$/;
  return regex.test(password);
};

export default validatePassword;
