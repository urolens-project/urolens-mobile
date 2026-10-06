export interface LoginFormValues {
  username: string;
  password: string;
}

/** Why the medtech was signed out, shown on the login screen as a banner. */
export type LogoutReason = 'inactivity';
