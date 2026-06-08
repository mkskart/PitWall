import { redirect } from 'next/navigation';

/** Bare /standings → current season. */
export default function StandingsIndex() {
  redirect(`/standings/${new Date().getFullYear()}`);
}
