export { User } from './user';

function notImplementedEntity(name) {
  const fn = async () => { throw new Error(`${name} API not implemented`); };
  return { list: fn, get: fn, filter: fn, create: fn, update: fn, delete: fn };
}

export const Patient = notImplementedEntity('Patient');
export const TherapySession = notImplementedEntity('TherapySession');
export const Feedback = notImplementedEntity('Feedback');
export const Notification = notImplementedEntity('Notification');
export const ConsultationLog = notImplementedEntity('ConsultationLog');
export const Hospital = notImplementedEntity('Hospital');
