export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  entityId: string;
  role: "admin" | "user";
  status: "pending" | "active" | "disabled";
}

export interface EntityCompany {
  id: string;
  name: string;
  status: "active" | "disabled";
}

export interface CommentItem {
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface RequestItem {
  requestId: string;
  userId: string;
  entityId: string;
  requestType: string;
  priority: "standard" | "urgent" | "sameday";
  status: "Submitted" | "Under Review" | "Processing" | "Completed" | "Rejected";
  description: string;
  attachments: string[];
  notes?: string;
  comments?: CommentItem[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const DEFAULT_ENTITIES: EntityCompany[] = [
  { id: "ent_rplai", name: "Rizal Poultry and Livestock Association, Inc.", status: "active" },
  { id: "ent_brasbag", name: "Brasbag Development Corporation", status: "active" },
  { id: "ent_happyhen", name: "Happy Hen Hatchery, Inc.", status: "active" },
  { id: "ent_havenbrook", name: "Havenbrook Properties, Inc.", status: "active" },
  { id: "ent_highridge", name: "Highridge Breeding Farms, Inc.", status: "active" },
  { id: "ent_riza", name: "Riza Development Corporation", status: "active" },
  { id: "ent_sunny", name: "Sunny and Scramble Corporation", status: "active" },
  { id: "ent_rizalpoultry", name: "Rizal Poultry Corporation", status: "active" }
];
