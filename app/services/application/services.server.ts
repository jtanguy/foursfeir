import type { CityService } from "../domain/city.interface";
import type { BookingService } from "../domain/booking.interface";
import type { ProfileService } from "../domain/profile.interface";
import type { AdminService } from "../domain/admin.interface";

import { client } from "../infrastructure/db/datastore";
import { DatastoreAdminService } from "../infrastructure/admin/datastore-admin.service";
import { DatastoreBookingService } from "../infrastructure/booking/datastore-booking.service";
import { DatastoreProfileService } from "../infrastructure/profile/datastore-profile.service";
import { DatastoreCityService } from "../infrastructure/city/datastore-city.service";

export const cityService: CityService = new DatastoreCityService(client);
export const bookingService: BookingService = new DatastoreBookingService(client);
export const profileService: ProfileService = new DatastoreProfileService(client);
export const adminService: AdminService = new DatastoreAdminService(client);
