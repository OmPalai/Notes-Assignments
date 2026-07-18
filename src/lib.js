// Uses the hostname in the browser address bar, so other LAN devices work too.
export const apiOrigin = `${window.location.protocol}//${window.location.hostname}:4000`;
export const api = `${apiOrigin}/api`;

export const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));