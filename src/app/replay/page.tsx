import { redirect } from 'next/navigation';

/** Bare /replay → most recent season, round 1. */
export default function ReplayIndex() {
  redirect(`/replay/${new Date().getFullYear()}/1`);
}
