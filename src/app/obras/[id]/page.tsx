import ObraDetailClient from './ObraDetailClient';

export async function generateStaticParams() {
  return [{ id: 'default' }];
}

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ObraDetailClient id={resolvedParams.id} />;
}
