import { EventEmitter } from 'events';

// Singleton event bus for app-wide events (e.g., new comments)
export const appEvents = new EventEmitter();
