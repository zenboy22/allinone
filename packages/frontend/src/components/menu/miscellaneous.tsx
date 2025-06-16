'use client';
import { PageWrapper } from '../shared/page-wrapper';
import { PageControls } from '../shared/page-controls';
import { Switch } from '../ui/switch';
import { useUserData } from '@/context/userData';
import { SettingsCard } from '../shared/settings-card';
import { Combobox } from '../ui/combobox';
import { RESOURCES } from '../../../../core/src/utils/constants';

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
  const { userData, setUserData } = useUserData();
  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Miscellaneous</h2>
          <p className="text-[--muted]">
            Additional settings and configurations.
          </p>
        </div>
        <div className="hidden lg:block lg:ml-auto">
          <PageControls />
        </div>
      </div>
      <div className="space-y-4">
        <SettingsCard title="Hide Errors">
          <Switch
            label="Hide Errors"
            help="AIOStreams will attempt to return the errors in responses to streams, catalogs etc. Turning this on will hide the errors."
            side="right"
            value={userData.hideErrors}
            onValueChange={(value) => {
              setUserData((prev) => ({
                ...prev,
                hideErrors: value,
              }));
            }}
          />
          <Combobox
            label="Hide Errors for specific resources"
            options={RESOURCES.map((resource) => ({
              label: resource,
              value: resource,
            }))}
            multiple
            help="This lets you hide errors for specific resources. For example, you may want to hide errors for the catalog resource, but not for the stream resource."
            emptyMessage="No resources found"
            value={userData.hideErrorsForResources}
            onValueChange={(value) => {
              setUserData((prev) => ({
                ...prev,
                hideErrorsForResources: value as (typeof RESOURCES)[number][],
              }));
            }}
          />
        </SettingsCard>
        <SettingsCard
          title="Pre-cache Next Episode"
          description="When requesting streams for series, AIOStreams will automatically request the next episode and if all streams are uncached, it will ping the URL of the first uncached stream according to your sort settings."
        >
          <Switch
            label="Enabled"
            side="right"
            value={userData.precacheNextEpisode}
            onValueChange={(value) => {
              setUserData((prev) => ({
                ...prev,
                precacheNextEpisode: value,
              }));
            }}
          />
        </SettingsCard>
        <SettingsCard
          title="External Downloads"
          description="Adds a stream that automatically opens the stream in your browser below every stream for easier downloading"
        >
          <Switch
            label="Enabled"
            side="right"
            value={userData.externalDownloads}
            onValueChange={(value) => {
              setUserData((prev) => ({
                ...prev,
                externalDownloads: value,
              }));
            }}
          />
        </SettingsCard>
      </div>
    </>
  );
}
