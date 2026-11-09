/* eslint-disable @typescript-eslint/no-explicit-any */

// A learner's display name. QR sign-ups get "User_ab12cd" as first name and
// "ab12cd" as last name (and a full name built from both), so the last name is
// left out when it only repeats the end of the first name.
export const learnerName = (l: any) => {
  const first = l.firstName || '';
  if (!first) return l.fullName || l.employeeId || 'Learner';
  const last = l.lastName && !first.endsWith(l.lastName) ? l.lastName : '';
  return last ? `${first} ${last}` : first;
};
