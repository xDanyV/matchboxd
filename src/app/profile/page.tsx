import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { ensureUsername } from '@/lib/username';

export default async function ProfileRedirectPage() {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/profile');
    }

    const username = await ensureUsername(session.user.id);

    if (!username) redirect('/');

    redirect(`/u/${username}`);
}