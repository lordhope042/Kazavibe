import MessagesClient from '@/components/MessagesClient';
export default function Page({ searchParams }: { searchParams: { u?: string } }) { return <MessagesClient startWith={searchParams.u} />; }
