import { StudioApp } from '@/components/studio-app';

export function generateStaticParams() {
  return [
    { section: 'inbox' },
    { section: 'chatbots' },
    { section: 'knowledge' },
    { section: 'workflows' },
    { section: 'integrations' },
    { section: 'analytics' },
    { section: 'settings' },
  ];
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <StudioApp activeSection={section} />;
}
