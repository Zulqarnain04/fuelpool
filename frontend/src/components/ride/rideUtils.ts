// src/components/ride/rideUtils.ts — shared status + time helpers for ride cards.
import {
  FP_PRIMARY, FP_PRIMARY_LIGHT, FP_SECONDARY, FP_SECONDARY_LIGHT, FP_WARNING, FP_DANGER,
  TEXT_LIGHT,
} from '../../constants/colors';

export interface StatusMeta { label: string; color: string; bg: string; }

export function statusMeta(status?: string): StatusMeta {
  switch (status) {
    case 'OPEN': return { label: 'Open', color: FP_PRIMARY, bg: FP_PRIMARY_LIGHT };
    case 'FULL': return { label: 'Full', color: FP_WARNING, bg: '#FBF3E6' };
    case 'IN_PROGRESS': return { label: 'In progress', color: FP_SECONDARY, bg: FP_SECONDARY_LIGHT };
    case 'COMPLETED': return { label: 'Completed', color: '#64748B', bg: '#F1F5F9' };
    case 'CANCELLED': return { label: 'Cancelled', color: FP_DANGER, bg: '#FCEAEA' };
    // request statuses
    case 'PENDING': return { label: 'Pending', color: FP_WARNING, bg: '#FBF3E6' };
    case 'ACCEPTED': return { label: 'Accepted', color: FP_PRIMARY, bg: FP_PRIMARY_LIGHT };
    case 'REJECTED': return { label: 'Rejected', color: FP_DANGER, bg: '#FCEAEA' };
    default: return { label: status ?? '—', color: TEXT_LIGHT, bg: '#F1F5F9' };
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtRideTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h12 = ((d.getHours() + 11) % 12) + 1;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${h12}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}
