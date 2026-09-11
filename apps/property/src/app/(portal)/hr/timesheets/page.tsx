import { redirect } from 'next/navigation';

// Timesheets now live in the consolidated Roster & HR page (Timesheets tab).
// This route is kept only so old links/bookmarks still land somewhere valid.
export default function TimesheetsRedirectPage(): never {
  redirect('/roster');
}
