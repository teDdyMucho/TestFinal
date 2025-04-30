/**
 * Utility functions for working with localStorage
 */

/**
 * Get an item from localStorage with type safety
 * @param key The key to retrieve
 * @param defaultValue Default value if key doesn't exist
 * @returns The parsed value or default value
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
}

/**
 * Set an item in localStorage with automatic JSON stringification
 * @param key The key to set
 * @param value The value to store
 */
export function setStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove an item from localStorage
 * @param key The key to remove
 */
export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Get a prefixed employee-specific storage item
 * @param employeeId The employee ID
 * @param key The key suffix
 * @param defaultValue Default value if key doesn't exist
 * @returns The parsed value or default value
 */
export function getEmployeeStorageItem<T>(employeeId: string, key: string, defaultValue: T): T {
  return getStorageItem<T>(`${key}_${employeeId}`, defaultValue);
}

/**
 * Set a prefixed employee-specific storage item
 * @param employeeId The employee ID
 * @param key The key suffix
 * @param value The value to store
 */
export function setEmployeeStorageItem<T>(employeeId: string, key: string, value: T): void {
  setStorageItem<T>(`${key}_${employeeId}`, value);
}

/**
 * Remove a prefixed employee-specific storage item
 * @param employeeId The employee ID
 * @param key The key suffix
 */
export function removeEmployeeStorageItem(employeeId: string, key: string): void {
  removeStorageItem(`${key}_${employeeId}`);
}
