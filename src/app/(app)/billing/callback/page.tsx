import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fulfill } from '@/lib/billing';

export default async function Page({ searchParams }: { searchParams: { reference?: string; trxref?: string } }) {
  const me = (await currentUser())!, ref = searchParams.reference ?? searchParams.trxref;
  let result: 'success' | 'failed' | 'pending' | 'unknown' | 'error' = 'unknown';
  if (ref) {
    const pay = await prisma.payment.findUnique({ where: { reference: ref } });
    if (pay && pay.userId === me.id) { try { result = await fulfill(ref); } catch (e) { console.error(e); result = 'error'; } }
  }
  const M = {
    success: ['fa-circle-check text-good', 'Welcome to KazaVibe Plus!', 'Your payment was confirmed and Plus is now active.'],
    pending: ['fa-clock text-brand-500', 'Payment pending', 'We have not received confirmation yet. Refresh this page in a minute. If money left your account it will be applied automatically.'],
    failed: ['fa-circle-xmark text-danger', 'Payment not completed', 'No charge was applied to your Plus plan. If money was taken, contact support through the Help Centre with your reference.'],
    error: ['fa-triangle-exclamation text-danger', 'We could not check your payment', 'Please refresh in a minute. If it keeps happening, contact support with your reference.'],
    unknown: ['fa-circle-question text-muted', 'Payment not found', 'We could not find that payment.'],
  }[result];
  return (
    <div className="card mx-auto max-w-md space-y-3 p-8 text-center">
      <i className={`fa-solid ${M[0]} text-4xl`} /><h1 className="text-2xl font-black">{M[1]}</h1><p className="text-sm text-soft">{M[2]}</p>
      {ref && <p className="break-all text-xs text-muted">Reference: {ref}</p>}
      <Link href="/plus" className="btn mt-2 inline-block">Back to KazaVibe Plus</Link>
    </div>
  );
}
