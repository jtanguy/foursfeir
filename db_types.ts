export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

/**
 * Makes some properties in T optional.
 */
type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

interface City {
  id: string;
  slug: string;
  label: string;
}

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: City;
      };
      Insert: Optional<City, "id">;
      Update: Partial<City>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
