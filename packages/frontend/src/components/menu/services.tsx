'use client';
import { useStatus } from '@/context/status';
import { PageWrapper } from '../shared/page-wrapper';
import { SERVICE_DETAILS } from '@aiostreams/core';
export function ServicesMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

function Content() {
  // const status = useStatus();

  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Services</h2>
          <p className="text-[--muted]">
            Configure and manage your streaming services.
          </p>
        </div>
        <div className="flex flex-1"></div>
      </div>
    </>
  );
}
