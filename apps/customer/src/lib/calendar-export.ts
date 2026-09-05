// Client-side calendar export for bookings — three paths, tried in order by
// the calling pages:
//  1. shareBookingICS()        — hands the .ics to the OS share sheet via the
//                                 Web Share API (file sharing), so a tap lands
//                                 straight in whatever calendar app the person
//                                 already uses. Mobile-first path.
//  2. buildGoogleCalendarUrl()  — a prefilled calendar.google.com/render link,
//                                 for browsers/desktop without file sharing.
//  3. downloadBookingICS()     — plain .ics file download, the universal
//                                 fallback (Apple Calendar, Outlook, etc. all
//                                 import a downloaded .ics directly).
// No backend endpoint needed for any of this. Check-in/out are represented
// as an all-day date range (VALUE=DATE / Google's date-only "dates" param),
// since a booking only carries dates, not specific check-in/out clock times.

interface BookingForCalendar {
  confirmationNumber?: string;
  checkIn: string;   // ISO date
  checkOut: string;  // ISO date
  propertyName: string;
  city?: string | null;
}

function toDateStamp(iso: string): string {
  // YYYYMMDD — used both by .ics VALUE=DATE and Google's "dates" param.
  return iso.slice(0, 10).replace(/-/g, '');
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function summaryFor(booking: BookingForCalendar): string {
  return `Stay at ${booking.propertyName}`;
}

function descriptionFor(booking: BookingForCalendar): string {
  return `Booking${booking.confirmationNumber ? ` #${booking.confirmationNumber}` : ''} — StayOS`;
}

function fileNameFor(booking: BookingForCalendar): string {
  const safeName = booking.propertyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${safeName || 'stay'}-${booking.confirmationNumber ?? 'booking'}.ics`;
}

export function buildBookingICS(booking: BookingForCalendar): string {
  const uid   = `${booking.confirmationNumber ?? 'booking'}@stayos.app`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = escapeICSText(summaryFor(booking));
  const description = escapeICSText(descriptionFor(booking));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayOS//Guest Portal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toDateStamp(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${toDateStamp(booking.checkOut)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
  ];
  if (booking.city) lines.push(`LOCATION:${escapeICSText(booking.city)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  // .ics requires CRLF line endings.
  return lines.join('\r\n');
}

export function downloadBookingICS(booking: BookingForCalendar): void {
  const ics  = buildBookingICS(booking);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(booking);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(booking: BookingForCalendar): string {
  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    summaryFor(booking),
    dates:   `${toDateStamp(booking.checkIn)}/${toDateStamp(booking.checkOut)}`,
    details: descriptionFor(booking),
  });
  if (booking.city) params.set('location', booking.city);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Returns true when the native share sheet was available and invoked —
// regardless of whether the person completes or cancels it there — and
// false only when file sharing genuinely isn't supported on this browser,
// so the caller knows to fall back to the Google Calendar link / .ics
// download menu instead.
export async function shareBookingICS(booking: BookingForCalendar): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;

  const ics  = buildBookingICS(booking);
  const file = new File([ics], fileNameFor(booking), { type: 'text/calendar' });

  if (!navigator.canShare({ files: [file] })) return false;

  try {
    await navigator.share({ files: [file], title: summaryFor(booking) });
    return true;
  } catch (err) {
    // AbortError = the person cancelled the share sheet themselves — the
    // feature worked, they just changed their mind, so this still counts
    // as "handled" rather than falling through to the manual menu.
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    return false;
  }
}
