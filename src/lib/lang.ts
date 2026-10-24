import { cookies } from 'next/headers';
import type { Lang } from './i18n';
export const getLang = (): Lang => (cookies().get('kv-lang')?.value === 'ha' ? 'ha' : 'en');
