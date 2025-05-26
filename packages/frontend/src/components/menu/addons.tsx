'use client';
import { PageWrapper } from '../shared/page-wrapper';

export function AddonsMenu() {
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
          <h2>Addons</h2>
          <p className="text-[--muted]">
            Add your addons here. Either choose from presets, or add your own
            with its' manifest URLs.
          </p>
        </div>
        <div className="flex flex-1"></div>
      </div>
    </>
  );
}
