export interface AuthModuleStatus {
  module: "auth";
  status: "available";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}
