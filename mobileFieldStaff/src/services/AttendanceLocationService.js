import * as Location from 'expo-location';
import { captureWithApi } from '../utils/attendanceLocation';

/**
 * FA-ATTENDANCE-LOCATION-01: single location fix at check-in / check-out.
 * Foreground permission only; no background or continuous tracking, and never the
 * last-known-position API: a stale position must not stand in for the event.
 */
export function captureAttendanceLocation() {
  return captureWithApi(Location, {
    positionOptions: { accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false },
  });
}
