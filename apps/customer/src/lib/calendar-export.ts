// Client-side .ics generation — no backend endpoint needed. Works with
// Google Calendar, Apple Calendar, and Outlook, all of which import a
// downloaded .ics file directly. Check-in/out are represented as an
// all-day date range (DTSTART/DTEND with VALUE=DATE), since a booking
// only carries dates, not specific check-in/out clock times.

interface BookingForCalendar {
  confirmationNumber?: string;
  checkIn: string;   // ISO date
  checkOut: string;  // ISO date
  propertyName: string;
  city?: string | null;
}

function toICSDate(iso: string): string {
  // VALUE=DATE wants YYYYMMDD, no time/timezone component.
  return iso.slice(0, 10).replace(/-/g, '');
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function buildBookingICS(booking: BookingForCalendar): string {
  const uid   = `${booking.confirmationNumber ?? 'booking'}@stayos.app`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = escapeICSText(`Stay at ${booking.propertyName}`);
  const description = escapeICSText(
    `Booking${booking.confirmationNumber ? ` #${booking.confirmationNumber}` : ''} — StayOS`
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayOS//Guest Portal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toICSDate(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${toICSDate(booking.checkOut)}`,
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
  const safeName = booking.propertyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  a.href = url;
  a.download = `${safeName || 'stay'}-${booking.confirmationNumber ?? 'booking'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
