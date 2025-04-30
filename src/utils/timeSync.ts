/**
 * Utility functions for synchronizing time with internet sources
 * Provides accurate New York time regardless of local computer clock
 */
import { Timestamp } from "firebase/firestore";

// Cache for the time offset (difference between local time and server time)
let timeOffset: number | null = null;
let lastSync: number = 0;

// New York timezone identifier
const NY_TIMEZONE = 'America/New_York';

/**
 * Fetch the current time from a time API and calculate the offset
 * @returns Promise that resolves when sync is complete
 */
export async function syncTimeWithServer(): Promise<void> {
  try {
    // Use WorldTimeAPI to get accurate time for New York
    const response = await fetch(`https://worldtimeapi.org/api/timezone/${NY_TIMEZONE}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch time: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Server time in milliseconds
    const serverTime = new Date(data.datetime).getTime();
    
    // Local time in milliseconds
    const localTime = Date.now();
    
    // Calculate offset (how much local time differs from server time)
    timeOffset = serverTime - localTime;
    lastSync = localTime;
    
    console.log(`Time synchronized with server. Offset: ${timeOffset}ms`);
  } catch (error) {
    console.error('Error syncing time with server:', error);
    // If sync fails, don't update the offset
  }
}

/**
 * Get the current New York time, adjusted using the server offset
 * @returns Date object with the current New York time
 */
export function getNYTime(): Date {
  // If we have an offset, apply it to the local time
  if (timeOffset !== null) {
    return new Date(Date.now() + timeOffset);
  }
  
  // Fallback: If we don't have an offset yet, use local time
  // but format it as if it were in New York timezone
  const localDate = new Date();
  
  try {
    // Try to convert local time to NY time using built-in methods
    return new Date(localDate.toLocaleString('en-US', { timeZone: NY_TIMEZONE }));
  } catch (error) {
    console.error('Error converting to NY timezone:', error);
    return localDate; // Last resort fallback
  }
}

/**
 * Get a timestamp for the current New York time
 * @returns Firebase-compatible Timestamp object
 */
export function getNYTimestamp(): Timestamp {
  const nyTime = getNYTime();
  
  // Create a proper Firebase Timestamp object
  return Timestamp.fromDate(nyTime);
}

/**
 * Check if we should resync with the time server
 * Resyncs if it's been more than 1 hour since last sync
 */
export async function checkAndResync(): Promise<void> {
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
  
  if (timeOffset === null || (Date.now() - lastSync) > ONE_HOUR) {
    await syncTimeWithServer();
  }
}

// Initialize by syncing time when this module is first imported
syncTimeWithServer().catch(console.error);
