export interface UserEngagementDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  score: number;
  status: "Active" | "Inactive" | "New" | "Suspended";
}
