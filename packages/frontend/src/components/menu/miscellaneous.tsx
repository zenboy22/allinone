'use client';
import { PageWrapper } from '../shared/page-wrapper';

export function MiscellaneousMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

function Content() {
  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Miscellaneous</h2>
          <p className="text-[--muted]">
            Additional settings and configurations.
          </p>
        </div>
        <div className="flex flex-1"></div>
      </div>
    </>
  );
}
