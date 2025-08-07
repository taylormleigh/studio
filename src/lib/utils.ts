
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A centralized logging function that adds a timestamp and only logs in development.
 * @param message The primary message to log.
 * @param data Optional additional data to log.
 */
export function log(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    const logMessage = `[${new Date().toISOString()}] ${message}`;
    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}
