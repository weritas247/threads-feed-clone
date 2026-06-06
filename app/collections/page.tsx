import { listCollections } from '@/lib/collectionStore';
import { CollectionsClient } from '@/components/CollectionsClient';

export const dynamic = 'force-dynamic';

export default function CollectionsPage() {
  return (
    <>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-fg">컬렉션</h1>
        <p className="text-sm text-secondary">
          포스트를 프로젝트나 읽기 목록으로 묶고, 정리 노트를 만들거나 내보내세요.
        </p>
      </div>
      <CollectionsClient initial={listCollections()} />
    </>
  );
}
