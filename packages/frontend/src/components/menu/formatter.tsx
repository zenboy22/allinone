'use client';
import { PageWrapper } from '../shared/page-wrapper';

import * as constants from '../../../../core/src/utils/constants';
import { ParsedStream } from '../../../../core/src/db/schemas';
import React, { useState, useEffect, useCallback } from 'react';
import { useUserData } from '@/context/userData';
import { SettingsCard } from '../shared/settings-card';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Switch } from '../ui/switch';
import { TextInput } from '../ui/text-input';
import FileParser from '@aiostreams/core/src/parser/file';
import { UserConfigAPI } from '@/services/api';
import { SNIPPETS } from '../../../../core/src/utils/constants';
import { Modal } from '@/components/ui/modal';
import { useDisclosure } from '@/hooks/disclosure';
import { Button } from '../ui/button';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { NumberInput } from '../ui/number-input';
import { PageControls } from '../shared/page-controls';
const formatterChoices = Object.values(constants.FORMATTER_DETAILS);

// Simple throttle utility
let lastCall = 0;
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      func(...args);
    }
  };
}

export function FormatterMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

function FormatterPreviewBox({
  name,
  description,
}: {
  name?: string;
  description?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-md p-4 border border-gray-800">
      <div
        className="text-xl font-bold mb-1 overflow-x-auto"
        style={{ whiteSpace: 'pre' }}
      >
        {name}
      </div>
      <div
        className="text-base text-muted-foreground overflow-x-auto"
        style={{ whiteSpace: 'pre' }}
      >
        {description}
      </div>
    </div>
  );
}

function Content() {
  const { userData, setUserData } = useUserData();
  const [selectedFormatter, setSelectedFormatter] =
    useState<constants.FormatterType>(
      (userData.formatter?.id as constants.FormatterType) ||
        formatterChoices[0].id
    );
  const [formattedStream, setFormattedStream] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);

  // Stream preview state
  const [filename, setFilename] = useState(
    'Movie.Title.2023.2160p.BluRay.HEVC.DV.TrueHD.Atmos.7.1.iTA.ENG-GROUP.mkv'
  );
  const [folder, setFolder] = useState(
    'Movie.Title.2023.2160p.BluRay.HEVC.DV.TrueHD.Atmos.7.1.iTA.ENG-GROUP'
  );
  const [indexer, setIndexer] = useState('RARBG');
  const [seeders, setSeeders] = useState(125);
  const [age, setAge] = useState<string>('10d');
  const [addonName, setAddonName] = useState('Torrentio');
  const [providerId, setProviderId] = useState<constants.ServiceId | 'none'>(
    'none'
  );
  const [isCached, setIsCached] = useState(true);
  const [type, setType] =
    useState<(typeof constants.STREAM_TYPES)[number]>('debrid');
  const [library, setLibrary] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(9120); // 2h 32m in seconds
  const [fileSize, setFileSize] = useState<number | undefined>(62500000000); // 58.2 GB in bytes
  const [proxied, setProxied] = useState(false);
  const [regexMatched, setRegexMatched] = useState('Regex Name');

  // Custom formatter state (to avoid losing one field when editing the other)
  const [customName, setCustomName] = useState(
    userData.formatter?.definition?.name || ''
  );
  const [customDescription, setCustomDescription] = useState(
    userData.formatter?.definition?.description || ''
  );

  // Keep userData in sync with custom formatter fields
  useEffect(() => {
    if (selectedFormatter === constants.CUSTOM_FORMATTER) {
      setUserData({
        ...userData,
        formatter: {
          id: constants.CUSTOM_FORMATTER,
          definition: { name: customName, description: customDescription },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customName, customDescription, selectedFormatter]);

  const handleFormatterChange = (value: string) => {
    setSelectedFormatter(value as constants.FormatterType);
    if (value === constants.CUSTOM_FORMATTER) {
      setCustomName(userData.formatter?.definition?.name || '');
      setCustomDescription(userData.formatter?.definition?.description || '');
    }
    setUserData({
      ...userData,
      formatter: {
        id: value as constants.FormatterType,
        definition:
          value === constants.CUSTOM_FORMATTER
            ? {
                name: userData.formatter?.definition?.name || '',
                description: userData.formatter?.definition?.description || '',
              }
            : undefined,
      },
    });
  };

  const formatStream = useCallback(async () => {
    if (isFormatting) return;

    try {
      setIsFormatting(true);
      const parsedFile = FileParser.parse(filename);
      const stream: ParsedStream = {
        type,
        addon: {
          name: addonName,
          identifyingName: addonName,
          enabled: true,
          manifestUrl: 'http://localhost:2000/manifest.json',
          timeout: 10000,
        },
        library,
        parsedFile,
        filename,
        folderName: folder,
        indexer,
        regexMatched: {
          name: regexMatched,
        },
        torrent: {
          infoHash: type === 'p2p' ? '1234567890' : undefined,
          seeders,
        },
        service:
          providerId === 'none'
            ? undefined
            : {
                id: providerId,
                cached: isCached,
              },
        age,
        duration,
        size: fileSize,
        proxied,
      };
      let data;
      if (selectedFormatter === constants.CUSTOM_FORMATTER) {
        const res = await UserConfigAPI.formatStream(
          stream,
          selectedFormatter,
          {
            name: customName,
            description: customDescription,
          },
          userData.addonName
        );
        if (!res.success) {
          toast.error(res.error || 'Failed to format stream');
          return;
        }
        data = res.data;
      } else {
        const res = await UserConfigAPI.formatStream(
          stream,
          selectedFormatter,
          undefined,
          userData.addonName
        );
        if (!res.success) {
          toast.error(res.error || 'Failed to format stream');
          return;
        }
        data = res.data;
      }
      setFormattedStream(data ?? null);
    } catch (error) {
      console.error('Error formatting stream:', error);
      toast.error('Failed to format stream');
    } finally {
      setIsFormatting(false);
    }
  }, [
    filename || undefined,
    folder || undefined,
    indexer,
    seeders,
    age,
    addonName,
    providerId,
    isCached,
    type,
    library,
    duration,
    fileSize,
    proxied,
    selectedFormatter,
    isFormatting,
    customName,
    customDescription,
    regexMatched,
  ]);

  // Throttled format function
  const throttledFormat = useCallback(throttle(formatStream, 200), [
    formatStream,
  ]);

  // Call format whenever relevant values change
  useEffect(() => {
    throttledFormat();
  }, [
    filename,
    folder,
    indexer,
    seeders,
    age,
    addonName,
    providerId,
    isCached,
    type,
    library,
    duration,
    fileSize,
    proxied,
    selectedFormatter,
    customName,
    regexMatched,
    customDescription,
  ]);

  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Formatter</h2>
          <p className="text-[--muted]">Format your streams to your liking.</p>
        </div>
        <div className="hidden lg:block lg:ml-auto">
          <PageControls />
        </div>
      </div>

      {/* Formatter Selection in its own SettingsCard */}
      <SettingsCard
        title="Formatter Selection"
        description="Choose how your streams should be formatted"
      >
        <Select
          value={selectedFormatter}
          onValueChange={handleFormatterChange}
          options={formatterChoices.map((f) => ({
            label: f.name,
            value: f.id,
          }))}
        />
        <p className="text-sm text-muted-foreground mt-2">
          {selectedFormatter !== constants.CUSTOM_FORMATTER &&
            formatterChoices.find((f) => f.id === selectedFormatter)
              ?.description}
        </p>
      </SettingsCard>

      {/* Custom Formatter Definition in its own SettingsCard, only if custom is selected */}
      {selectedFormatter === constants.CUSTOM_FORMATTER && (
        <SettingsCard
          title="Custom Formatter"
          description="Define your own formatter"
        >
          <div className="text-sm text-gray-400">
            Type <span className="font-mono">{'{debug.jsonf}'}</span> to see the
            available variables. For a more detailed explanation, check the{' '}
            <a
              href="https://github.com/Viren070/AIOStreams/wiki/Custom-Formatter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--brand] hover:text-[--brand]/80 hover:underline"
            >
              wiki
            </a>
            .
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Name Template
              </label>
              <Textarea
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter a template for the stream name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description Template
              </label>
              <Textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Enter a template for the stream description"
              />
            </div>
            <SnippetsButton />
          </div>
        </SettingsCard>
      )}

      {/* Preview in its own SettingsCard */}
      <SettingsCard
        title="Preview"
        description="See how your streams would be formatted based on controllable variables"
      >
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <FormatterPreviewBox
              name={formattedStream?.name}
              description={formattedStream?.description}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <TextInput
              label={<span className="truncate block">Filename</span>}
              value={filename}
              onValueChange={(value) => setFilename(value || '')}
              className="w-full"
            />
            <TextInput
              label={<span className="truncate block">Folder Name</span>}
              value={folder}
              onValueChange={(value) => setFolder(value || '')}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <TextInput
              label={<span className="truncate block">Indexer</span>}
              value={indexer}
              onValueChange={(value) => setIndexer(value || '')}
              className="w-full"
            />
            <NumberInput
              label={<span className="truncate block">Seeders</span>}
              value={seeders}
              onValueChange={(value) => setSeeders(value)}
              className="w-full"
              min={0}
              defaultValue={0}
            />
            <TextInput
              label={<span className="truncate block">Age</span>}
              value={age}
              onValueChange={(value) => setAge(value || '')}
              className="w-full"
            />
            <NumberInput
              label={<span className="truncate block">Duration (s)</span>}
              value={duration}
              onValueChange={(value) => setDuration(value || undefined)}
              className="w-full"
              min={0}
              step={1000}
              defaultValue={0}
            />
            <NumberInput
              label={<span className="truncate block">File Size (bytes)</span>}
              value={fileSize}
              onValueChange={(value) => setFileSize(value || undefined)}
              className="w-full"
              step={1000000000}
              defaultValue={0}
              min={0}
            />
            <TextInput
              label={<span className="truncate block">Regex Matched</span>}
              value={regexMatched}
              onValueChange={(value) => setRegexMatched(value || '')}
              className="w-full"
            />
          </div>

          {/* Service, Addon Name, and Stream Type on the same row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={<span className="truncate block">Service</span>}
              value={providerId}
              options={[
                { label: 'None', value: 'none' },
                ...Object.values(constants.SERVICE_DETAILS).map((service) => ({
                  label: service.name,
                  value: service.id,
                })),
              ]}
              onValueChange={(value: string) =>
                setProviderId(value as constants.ServiceId)
              }
              className="w-full"
            />
            <TextInput
              label={<span className="truncate block">Addon Name</span>}
              value={addonName}
              onChange={(e) => setAddonName(e.target.value)}
              className="w-full"
            />
            <Select
              label={<span className="truncate block">Stream Type</span>}
              value={type}
              onValueChange={(value: string) =>
                setType(value as (typeof constants.STREAM_TYPES)[number])
              }
              options={constants.STREAM_TYPES.map((type) => ({
                label: type.charAt(0).toUpperCase() + type.slice(1),
                value: type,
              }))}
              className="w-full"
            />
          </div>

          {/* Centralized Switches Container - flex row, wraps on small width, centered */}
          <div className="flex justify-center flex-wrap gap-4 pt-2">
            <Switch
              label={<span className="truncate block">Cached</span>}
              value={isCached}
              onValueChange={setIsCached}
            />
            <Switch
              label={<span className="truncate block">Library</span>}
              value={library}
              onValueChange={setLibrary}
            />
            <Switch
              label={<span className="truncate block">Proxied</span>}
              value={proxied}
              onValueChange={setProxied}
            />
          </div>
        </div>
      </SettingsCard>
    </>
  );
}

function SnippetsButton() {
  const disclosure = useDisclosure(false);

  return (
    <>
      <Button intent="white" size="sm" onClick={disclosure.open}>
        Snippets
      </Button>
      <Modal
        open={disclosure.isOpen}
        onOpenChange={disclosure.close}
        title="Formatter Snippets"
      >
        <div className="space-y-4">
          {SNIPPETS.map((snippet, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between border rounded-md p-3 bg-gray-900 border-gray-800"
            >
              <div>
                <div className="font-semibold text-base mb-1">
                  {snippet.name}
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {snippet.description}
                </div>
                <div className="font-mono text-xs bg-gray-800 rounded px-2 py-1 inline-block">
                  {snippet.value}
                </div>
              </div>
              <Button
                size="sm"
                intent="primary-outline"
                className="ml-4"
                onClick={async () => {
                  if (!navigator.clipboard) {
                    toast.error(
                      'The clipboard API is not available in this browser or context.'
                    );
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(snippet.value);
                    toast.success('Snippet copied to clipboard');
                  } catch (error) {
                    console.error(
                      'Failed to copy snippet to clipboard:',
                      error
                    );
                    toast.error('Failed to copy snippet to clipboard');
                  }
                }}
                title="Copy snippet"
              >
                <CopyIcon className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
