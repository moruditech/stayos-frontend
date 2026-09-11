import { redirect } from 'next/navigation';

// HR has been folded into the consolidated Roster & HR page (Staff & HR tab).
// This route is kept only so old links/bookmarks still land somewhere valid.
export default function HrRedirectPage(): never {
  redirect('/roster');
}
