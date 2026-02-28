import { useTranslations } from 'next-intl';
import Shell from '@/components/Shell';
import RitualScreen from './RitualScreen';

export default function HomePage() {
    const t = useTranslations();

    return (
        <Shell>
            <RitualScreen />
        </Shell>
    );
}
