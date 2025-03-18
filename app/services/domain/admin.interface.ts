import type { City } from "./city.interface";

export interface GlobalAdmin {
  type: "global";
  user_id: string;
}

export interface LocalAdmin {
  type: "local";
  user_id: string;
  cities: City[];
}

export type AdminInfo = GlobalAdmin | LocalAdmin;

export interface AdminService {
  // CRUD operations
  getAllAdmins(): Promise<AdminInfo[]>;
  getAdminInfo(userId: string): Promise<AdminInfo | null>;
  createAdmin(admin: AdminInfo): Promise<void>;
  updateAdmin(admin: AdminInfo): Promise<void>;
  deleteAdmin(userId: string): Promise<void>;

  // Permission checks
  isUserSuperAdmin(userId: string): Promise<boolean>;
  isUserAdmin(userId: string, citySlug: string): Promise<boolean>;
}
