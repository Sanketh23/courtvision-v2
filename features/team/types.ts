export type Role = "coach" | "player";

export type Membership = {
  id: string;
  teamId: string;
  userId: string;
  role: Role;
};

export type TeamSummary = {
  id: string;
  name: string;
};
