'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { useUserData } from '@/context/userData';
import { UserConfigAPI } from '@/services/api';
import { PageWrapper } from '@/components/shared/page-wrapper';
import { Alert } from '@/components/ui/alert';
import { SettingsCard } from '../shared/settings-card';
import { toast } from 'sonner';
import { CopyIcon, DownloadIcon, PlusIcon, UploadIcon } from 'lucide-react';
import { useStatus } from '@/context/status';
import { BiCopy } from 'react-icons/bi';
import { PageControls } from '../shared/page-controls';
import { useDisclosure } from '@/hooks/disclosure';
import { Modal } from '../ui/modal';
import { Switch } from '../ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

export function SaveInstallMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

function Content() {
  const {
    userData,
    setUserData,
    uuid,
    setUuid,
    password,
    setPassword,
    encryptedPassword,
    setEncryptedPassword,
  } = useUserData();
  const [newPassword, setNewPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [passwordRequirements, setPasswordRequirements] = React.useState<
    string[]
  >([]);
  const { status } = useStatus();
  const baseUrl = status?.settings?.baseUrl || window.location.origin;
  const [addonPassword, setAddonPassword] = React.useState('');
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const installModal = useDisclosure(false);
  const [filterCredentialsInExport, setFilterCredentialsInExport] =
    React.useState(false);

  React.useEffect(() => {
    if (userData?.addonPassword) {
      setAddonPassword(userData.addonPassword);
    }
  }, [userData]);

  React.useEffect(() => {
    const requirements: string[] = [];

    // already created a config
    if (uuid && password) {
      setPasswordRequirements([]);
      return;
    }

    if (newPassword.length < 8) {
      requirements.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(newPassword)) {
      requirements.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(newPassword)) {
      requirements.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(newPassword)) {
      requirements.push('Password must contain at least one number');
    }
    if (!/[@$!%*?&\-\._#~^()+=<>,;:'"`{}[\]|\\]/.test(newPassword)) {
      requirements.push(
        'Password must contain at least one special character (@$!%*?&-._#~^()+=<>,;:\'"`{}[]|\\)'
      );
    }

    setPasswordRequirements(requirements);
  }, [newPassword, uuid, password]);

  const handleSave = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (passwordRequirements.length > 0) {
      toast.error('Password requirements not met');
      return;
    }
    setLoading(true);

    try {
      const result = uuid
        ? await UserConfigAPI.updateConfig(uuid, userData, password!)
        : await UserConfigAPI.createConfig(userData, newPassword);

      if (!result.success) {
        toast.error(result.error || 'Failed to save configuration');
        return;
      }

      if (!uuid && result.data) {
        toast.success(
          'Configuration created successfully, your UUID and password are below'
        );
        setUuid(result.data.uuid);
        setEncryptedPassword(result.data.encryptedPassword);
        setPassword(newPassword);
      } else if (uuid && result.success) {
        toast.success('Configuration updated successfully');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // const validate = UserDataSchema.safeParse(json);
        // if (!validate.success) {
        //   toast.error('Failed to import configuration: Invalid JSON file');
        //   return;
        // }
        setUserData((prev) => ({
          ...prev,
          ...json,
        }));
        toast.success('Configuration imported successfully');
      } catch (err) {
        toast.error('Failed to import configuration: Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(
        {
          ...userData,
          addonPassword: filterCredentialsInExport
            ? undefined
            : userData.addonPassword,
          services: userData?.services?.map((service) => ({
            ...service,
            credentials: filterCredentialsInExport ? {} : service.credentials,
          })),
        },
        null,
        2
      );
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aiostreams-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export configuration');
    }
  };

  const manifestUrl = `${baseUrl}/stremio/${uuid}/${encryptedPassword}/manifest.json`;
  const encodedManifest = encodeURIComponent(manifestUrl);

  const copyManifestUrl = async () => {
    try {
      if (!navigator.clipboard) {
        toast.error(
          'The Clipboard API is not supported on this browser or context, please manually copy the URL'
        );
        return;
      }
      await navigator.clipboard.writeText(manifestUrl);
      toast.success('Manifest URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy manifest URL');
    }
  };

  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Install Addon</h2>
          <p className="text-[--muted]">
            Configure and install your personalized Stremio addon
          </p>
        </div>
        <div className="hidden lg:block lg:ml-auto">
          <PageControls />
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {!uuid ? (
          <SettingsCard
            title="Create Configuration"
            description="Set up your personalised addon configuration"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                {passwordRequirements.length > 0 && newPassword?.length > 0 && (
                  <Alert
                    intent="alert"
                    title="Password Requirements"
                    description={
                      <ul className="list-disc list-inside">
                        {passwordRequirements.map((requirement) => (
                          <li key={requirement}>{requirement}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                <TextInput
                  label="Password"
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a password to protect your configuration"
                  required
                />
                <p className="text-sm text-[--muted] mt-1">
                  This is the password you will use to access and update your
                  configuration later. You cannot change this or reset the
                  password once set, so please choose wisely, and remember it.
                </p>
              </div>
              {status?.settings.protected && (
                <>
                  <TextInput
                    label="Addon Password"
                    type="password"
                    value={addonPassword}
                    required
                    placeholder="Enter the password for this instance"
                    help={
                      <>
                        This would be the value of the{' '}
                        <code>ADDON_PASSWORD</code> environment variable
                      </>
                    }
                    onValueChange={(value) => {
                      setAddonPassword(value);
                      setUserData((prev) => ({
                        ...prev,
                        addonPassword: value,
                      }));
                    }}
                  />
                </>
              )}
              <Button intent="white" type="submit" loading={loading} rounded>
                Create
              </Button>
            </form>
          </SettingsCard>
        ) : (
          <>
            <SettingsCard
              title="Update Configuration"
              description="Update your configuration now with the current configuration."
            >
              <div className="flex items-start gap-1">
                <Alert
                  intent="info"
                  isClosable={false}
                  description={
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-md text-[--primary]">
                          Your UUID: <span className="font-bold">{uuid}</span>
                        </span>
                        <BiCopy
                          className="min-h-5 min-w-5 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(uuid);
                            toast.success('UUID copied to clipboard');
                          }}
                        />
                      </div>
                      <p className="text-sm text-[--muted]">
                        Save your UUID and password - you'll need them to update
                        your configuration later
                      </p>
                    </div>
                  }
                  className="flex-1"
                />
              </div>
              <form onSubmit={handleSave}>
                {status?.settings.protected && (
                  <>
                    <TextInput
                      label="Addon Password"
                      id="password"
                      type="password"
                      value={addonPassword}
                      required
                      placeholder="Enter the password for this instance"
                      help={
                        <>
                          This would be the value of the{' '}
                          <code>ADDON_PASSWORD</code> environment variable
                        </>
                      }
                      onValueChange={(value) => {
                        setAddonPassword(value);
                        setUserData((prev) => ({
                          ...prev,
                          addonPassword: value,
                        }));
                      }}
                    />
                  </>
                )}
                <Button type="submit" intent="white" loading={loading} rounded>
                  Update
                </Button>
              </form>
            </SettingsCard>

            {/* <SettingsCard
              title="Install"
              description="Choose how you want to install your personalized addon. There is no need to reinstall the addon after updating your configuration above, unless you've updated your upstream addons."
            >
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    window.open(
                      `stremio://${baseUrl.replace(/^https?:\/\//, '')}/stremio/${uuid}/${encryptedPassword}/manifest.json`
                    )
                  }
                >
                  Stremio Desktop
                </Button>
                <Button
                  onClick={() =>
                    window.open(
                      `https://web.stremio.com/#/addons?addon=${encodedManifest}`
                    )
                  }
                >
                  Stremio Web
                </Button>
                <Button onClick={copyManifestUrl}>Copy URL</Button>
              </div>
            </SettingsCard> */}

            <SettingsCard
              title="Install"
              description="Install your addon using your preferred method. There usually isn't a need to reinstall the addon after updating your configuration above, unless you use catalogs and you've changed the order of them or the addons that provide them"
            >
              <Button intent="white" rounded onClick={installModal.open}>
                Install
              </Button>

              <Modal
                open={installModal.isOpen}
                onOpenChange={installModal.toggle}
                title="Install"
                description="Install your addon"
              >
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={() =>
                      window.open(
                        `stremio://${baseUrl.replace(/^https?:\/\//, '')}/stremio/${uuid}/${encryptedPassword}/manifest.json`
                      )
                    }
                    intent="primary"
                    className="w-full"
                  >
                    Stremio
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://web.stremio.com/#/addons?addon=${encodedManifest}`
                      )
                    }
                    intent="primary"
                    className="w-full"
                  >
                    Stremio Web
                  </Button>
                  <Button
                    onClick={copyManifestUrl}
                    intent="primary"
                    className="w-full"
                  >
                    Copy URL
                  </Button>
                </div>
              </Modal>
            </SettingsCard>
          </>
        )}

        <SettingsCard
          title="Backups"
          description="Export your settings or restore from a backup file"
        >
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              leftIcon={<UploadIcon />}
              intent="gray"
            >
              Export
            </Button>
            <div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                id="import-file"
                onChange={handleImport}
                ref={importFileRef}
              />
              <label htmlFor="import-file">
                <Button
                  intent="gray"
                  leftIcon={<DownloadIcon />}
                  type="button"
                  className="cursor-pointer"
                  onClick={() => importFileRef.current?.click()}
                >
                  Import
                </Button>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 w-full">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="export-settings" className="w-full">
                <AccordionTrigger className="w-full">
                  Export Settings
                </AccordionTrigger>
                <AccordionContent className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <Switch
                      value={filterCredentialsInExport ?? false}
                      onValueChange={(value) =>
                        setFilterCredentialsInExport(value)
                      }
                      side="right"
                      label="Exclude Credentials"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </SettingsCard>
      </div>
    </>
  );
}
