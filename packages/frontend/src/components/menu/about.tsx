'use client';
import { PageWrapper } from '../shared/page-wrapper';

export function AboutMenu() {
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
          <h2>About</h2>
          <p className="text-[--muted]">
            Information about AIOStreams and its features.
          </p>
        </div>
        <div className="flex flex-1"></div>
      </div>
    </>
  );
}
