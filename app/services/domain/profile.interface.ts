import DataLoader from "dataloader";
import { NIL, v5 } from "uuid";

export interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
  favorite_city?: string;
}

export interface ProfileService {
  loader: DataLoader<string, Profile>;
  getProfileById(userId: string): Promise<Profile | null>;
  createProfile(data: Profile): Promise<Profile>;
  updateProfile(
    data: Partial<Profile> & Pick<Profile, "user_id">
  ): Promise<Profile>;
  getProfiles(): Promise<Profile[]>;
  findProfile(email: string): Promise<Profile>;
  clearProfileCache(): void;
  searchProfiles(query: string): Promise<{ profile: Profile; score: number }[]>;
}

// Implémentation des fonctions utilitaires
export function isProfile(p: Profile | Error | null): p is Profile {
  return p !== null && !(p instanceof Error);
}

export function emailToFoursfeirId(email: string): string {
  const foursfeir_ns = v5("foursfeir", NIL);
  return v5(email, foursfeir_ns);
}
