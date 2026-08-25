const STORAGE_KEY = 'pospe-pos-device-id';

// Stable across logout/login and browser restarts — sync-service keys
// SyncDevice rows by this, so a manager's "sync status" view reads as one
// continuous terminal rather than a new row every shift.
export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
