import { getTranslations } from 'next-intl/server';
import InvestorView from './InvestorView';

export async function generateMetadata() {
    const t = await getTranslations('investor');
    return {
        title: `THABAT — ${t('title')}`,
        description: t('subtitle'),
        robots: 'noindex, nofollow',
    };
}

export default function InvestorPage() {
    return <InvestorView />;
}
