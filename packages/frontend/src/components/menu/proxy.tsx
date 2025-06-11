'use client';
import { useStatus } from '@/context/status';
import { PageWrapper } from '../shared/page-wrapper';
import { useState, useEffect } from 'react';
import * as constants from '../../../../core/src/utils/constants';
import { useUserData } from '@/context/userData';
import { Switch } from '../ui/switch';
import { Select } from '../ui/select';
import { Combobox } from '../ui/combobox';
import { SettingsCard } from '../shared/settings-card';
import { TextInput } from '../ui/text-input';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import MarkdownLite from '../shared/markdown-lite';
import { PageControls } from '../shared/page-controls';
type ProxyServiceId = keyof typeof constants.PROXY_SERVICE_DETAILS;

type ProxyConfig = {
  enabled: boolean;
  id: ProxyServiceId;
  url: string;
  credentials: string;
  publicIp?: string;
  proxiedAddons?: string[];
  proxiedServices?: string[];
};

export function ProxyMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

// provides a page to configure a proxy
// use constants.PROXY_DETAILS to get the list of proxies
// and use status.settings.defaults.proxy to load default values if current userData doesn't have a value
// use status.settings.forced.proxy to always load the forced values

// should look like this.
// a switch to enable/disable the proxy. should be enabled on left and then switch on right, with descriptin of setting below.
// when disabled, hide the rest of the settings
// a select menu to choose a proxy, mapped to the proxy.id option (Get name/label from details)
// shows the description below the select.
// then a password input to provide the credential
// then a multi select menu to choose services that proxy is used for
// then a multi select menu to choose addons that proxy is used for
// addon labels should use the addon name, and value should be the ID, calculated using same method as getPresetUniqueKey in addons.tsx

function Content() {
  const { status } = useStatus();
  const { userData, setUserData } = useUserData();
  const details = constants.PROXY_SERVICE_DETAILS;

  // Initialize proxy configuration from userData, defaults, or forced values
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [selectedProxyId, setSelectedProxyId] =
    useState<ProxyServiceId>('mediaflow');
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyCredentials, setProxyCredentials] = useState('');
  const [proxiedServices, setProxiedServices] = useState<string[] | undefined>(
    undefined
  );
  const [proxiedAddons, setProxiedAddons] = useState<string[] | undefined>(
    undefined
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Effect to initialize values from userData/defaults/forced
  useEffect(() => {
    if (!status) return;

    const forced = status.settings.forced.proxy;
    const defaults = status.settings.defaults.proxy;
    const current = userData.proxy;

    // Apply forced values first, then current values, then defaults
    setProxyEnabled(
      forced.enabled ?? current?.enabled ?? defaults.enabled ?? false
    );
    setSelectedProxyId(
      (forced.id ?? current?.id ?? defaults.id ?? '') as ProxyServiceId
    );
    setProxyCredentials(
      forced.credentials ?? current?.credentials ?? defaults.credentials ?? ''
    );
    setProxyUrl(forced.url ?? current?.url ?? defaults.url ?? '');
    setProxiedServices(
      forced.proxiedServices ??
        current?.proxiedServices ??
        defaults.proxiedServices ??
        []
    );
    setProxiedAddons(current?.proxiedAddons);
    setHasChanges(false);
  }, [status]);

  // Generate options for proxy service select
  const proxyOptions = Object.entries(details).map(([id, detail]) => ({
    label: detail.name,
    value: id,
  }));

  // Generate options for services multi-select
  const serviceOptions = [
    ...Object.values(constants.SERVICE_DETAILS).map((service) => ({
      label: service.name,
      value: service.id,
      textValue: service.name,
    })),
    {
      label: 'None',
      value: 'none',
      textValue: 'None',
    },
  ];

  const addonOptions = userData.presets.map((preset) => {
    return {
      label: preset.options.name,
      value: JSON.stringify(preset),
      textValue: preset.options.name,
    };
  });

  // Handle changes
  const handleProxyChange = (enabled: boolean) => {
    setProxyEnabled(enabled);
    if (!enabled && !selectedProxyId && userData.proxy === undefined) {
      setHasChanges(false);
    } else {
      setHasChanges(true);
    }
  };

  const handleUrlChange = (value: string) => {
    setProxyUrl(value);
    setHasChanges(true);
  };

  const handleProxyServiceChange = (value: string) => {
    setSelectedProxyId(value as ProxyServiceId);
    setHasChanges(true);
  };

  const handleCredentialsChange = (value: string) => {
    setProxyCredentials(value);
    setHasChanges(true);
  };

  const handleProxiedServicesChange = (values: string[]) => {
    setProxiedServices(values);
    setHasChanges(true);
  };

  const handleProxiedAddonsChange = (values: string[]) => {
    setProxiedAddons(values);
    setHasChanges(true);
  };

  const handleSubmit = () => {
    const proxyConfig: ProxyConfig = {
      enabled: proxyEnabled,
      id: selectedProxyId,
      url: proxyUrl,
      credentials: proxyCredentials,
      proxiedServices: proxiedServices,
      proxiedAddons: proxiedAddons,
    };

    setUserData((prev) => ({
      ...prev,
      proxy: proxyConfig,
    }));

    setHasChanges(false);
    toast.success('Proxy settings saved');
  };

  // Check if values are forced
  const isForced = status?.settings.forced.proxy;
  const isProxyForced = isForced?.enabled !== null;
  const isUrlForced = isForced?.url !== null;
  const isIdForced = isForced?.id !== null;
  const isCredentialsForced = isForced?.credentials !== null;
  const isServicesForced = isForced?.proxiedServices !== null;
  const isProxiedAddonsDisabled = isForced?.disableProxiedAddons;

  const selectedProxyDetails = selectedProxyId
    ? details[selectedProxyId]
    : undefined;

  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Proxy</h2>
          <p className="text-[--muted]">
            Configure a proxy for your streams to bypass IP restrictions or
            improve compatibility
          </p>
        </div>
        <div className="hidden lg:block lg:ml-auto">
          <PageControls />
        </div>
      </div>

      <div className="space-y-2">
        <SettingsCard>
          <Switch
            side="right"
            label="Enable"
            value={proxyEnabled}
            onValueChange={handleProxyChange}
            disabled={isProxyForced}
          />
        </SettingsCard>

        <SettingsCard>
          <div className="space-y-2">
            <Select
              label="Proxy Service"
              value={selectedProxyId}
              onValueChange={handleProxyServiceChange}
              options={proxyOptions}
              disabled={isIdForced || !proxyEnabled}
            />
            {selectedProxyDetails && (
              <p className="text-[--muted] text-sm">
                <MarkdownLite>{selectedProxyDetails.description}</MarkdownLite>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <TextInput
              label="URL"
              value={proxyUrl}
              type="password"
              onValueChange={handleUrlChange}
              placeholder="Enter proxy URL"
              disabled={isUrlForced || !proxyEnabled}
            />
            <p className="text-[--muted] text-sm">
              The URL of your hosted proxy service.
            </p>
          </div>

          <div className="space-y-2">
            <TextInput
              label="Credentials"
              type="password"
              value={proxyCredentials}
              onValueChange={handleCredentialsChange}
              placeholder="Enter proxy credentials"
              disabled={isCredentialsForced || !proxyEnabled}
            />
            {selectedProxyDetails && (
              <p className="text-[--muted] text-sm">
                <MarkdownLite>
                  {selectedProxyDetails.credentialDescription}
                </MarkdownLite>
              </p>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Proxy Controls"
          description="Optionally, specify services and addons that should be proxied. These options are applied conjunctively."
        >
          <div className="space-y-2">
            <Combobox
              label="Proxied Services"
              value={proxiedServices}
              onValueChange={handleProxiedServicesChange}
              options={serviceOptions}
              placeholder="Select services to proxy"
              multiple={true}
              disabled={isServicesForced || !proxyEnabled}
              emptyMessage="No services available"
            />
            <p className="text-[--muted] text-sm">
              Only streams (that are detected to be) from these services will be
              proxied. Select None to enable proxying of streams that are not
              detected to be from a service.
            </p>
          </div>

          <div className="space-y-2">
            <Combobox
              label="Proxied Addons"
              value={proxiedAddons}
              onValueChange={handleProxiedAddonsChange}
              options={addonOptions}
              placeholder="Select addons to proxy"
              multiple={true}
              disabled={isProxiedAddonsDisabled || !proxyEnabled}
              emptyMessage="No addons available"
            />
            <p className="text-[--muted] text-sm">
              Only streams from these addons will be proxied
            </p>
          </div>
        </SettingsCard>
      </div>

      <div className="flex justify-start mt-4">
        <Button
          intent="white"
          rounded
          onClick={handleSubmit}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </div>
    </>
  );
}
