// Single source of truth for BullMQ queue names, so two producers can never
// silently collide on the same underlying Redis queue.
export enum QueueNames {
  EMAIL = "email",
}
