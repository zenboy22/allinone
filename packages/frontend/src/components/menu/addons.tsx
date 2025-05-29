'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { PageWrapper } from '../shared/page-wrapper';
import { useStatus } from '@/context/status';
import { useUserData } from '@/context/userData';
import { SettingsCard } from '../shared/settings-card';
import { Button, IconButton } from '../ui/button';
import { Modal } from '../ui/modal';
import { Switch } from '../ui/switch';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusIcon, SearchIcon, FilterIcon } from 'lucide-react';
import TemplateOption from '../shared/template-option';
import * as constants from '../../../../core/src/utils/constants';
import { TextInput } from '../ui/text-input';

import { Popover } from '../ui/popover';
import { BiEdit, BiTrash } from 'react-icons/bi';
import { Option, Resource } from '@aiostreams/core';
import { toast } from 'sonner';

export function AddonsMenu() {
  return (
    <PageWrapper className="space-y-4 p-4 sm:p-8">
      <Content />
    </PageWrapper>
  );
}

function Content() {
  const { status } = useStatus();
  const { userData, setUserData } = useUserData();
  const [search, setSearch] = useState('');
  // Filter states
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [streamTypeFilters, setStreamTypeFilters] = useState<
    constants.StreamType[]
  >([]);
  const [resourceFilters, setResourceFilters] = useState<string[]>([]);
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalPreset, setModalPreset] = useState<any | null>(null);
  const [modalInitialValues, setModalInitialValues] = useState<
    Record<string, any>
  >({});
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Filtering and search for marketplace
  const filteredPresets = useMemo(() => {
    if (!status?.settings?.presets) return [];
    return status.settings.presets.filter((preset) => {
      const matchesService =
        serviceFilters.length === 0 ||
        preset.ID === 'custom' ||
        (preset.SUPPORTED_SERVICES &&
          serviceFilters.every((s) => preset.SUPPORTED_SERVICES.includes(s)));
      const matchesStreamType =
        streamTypeFilters.length === 0 ||
        preset.ID === 'custom' ||
        (preset.SUPPORTED_STREAM_TYPES &&
          streamTypeFilters.every((t) =>
            preset.SUPPORTED_STREAM_TYPES.includes(t)
          ));
      const matchesResource =
        resourceFilters.length === 0 ||
        preset.ID === 'custom' ||
        (preset.SUPPORTED_RESOURCES &&
          resourceFilters.every((r) =>
            preset.SUPPORTED_RESOURCES.includes(r as Resource)
          ));
      const matchesSearch =
        !search ||
        preset.NAME.toLowerCase().includes(search.toLowerCase()) ||
        preset.DESCRIPTION.toLowerCase().includes(search.toLowerCase());
      return (
        matchesService && matchesStreamType && matchesResource && matchesSearch
      );
    });
  }, [status, search, serviceFilters, streamTypeFilters, resourceFilters]);

  // My Addons (user's enabled/added presets)

  // AddonModal handlers
  function handleAddPreset(preset: any) {
    setModalPreset(preset);
    setModalInitialValues({
      options: Object.fromEntries(
        (preset.OPTIONS || []).map((opt: any) => [
          opt.id,
          opt.default ?? undefined,
        ])
      ),
    });
    setModalMode('add');
    setEditingAddonId(null);
    setModalOpen(true);
  }

  function handleModalSubmit(values: Record<string, any>) {
    if (modalMode === 'add' && modalPreset) {
      // Always add a new preset with default values, never edit
      const newPreset = {
        id: modalPreset.ID,
        enabled: true,
        options: values.options,
      };
      const newKey = getPresetUniqueKey(newPreset);
      // Prevent adding if a preset with the same unique key already exists
      if (userData.presets.some((a) => getPresetUniqueKey(a) === newKey)) {
        toast.error('You already have an addon with the same options added.');
        setModalOpen(false);
        return;
      }
      setUserData((prev) => ({
        ...prev,
        presets: [...prev.presets, newPreset],
      }));
      setModalOpen(false);
    } else if (modalMode === 'edit' && editingAddonId) {
      // Edit existing preset (should not be triggered from marketplace)
      setUserData((prev) => ({
        ...prev,
        presets: prev.presets.map((a) =>
          getPresetUniqueKey(a) === editingAddonId
            ? { ...a, options: values.options }
            : a
        ),
      }));
      setModalOpen(false);
    }
  }

  // DND for My Addons
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = userData.presets.findIndex(
        (a) => getPresetUniqueKey(a) === active.id
      );
      const newIndex = userData.presets.findIndex(
        (a) => getPresetUniqueKey(a) === over.id
      );
      const newPresets = arrayMove(userData.presets, oldIndex, newIndex);
      setUserData((prev) => ({
        ...prev,
        presets: newPresets,
      }));
    }
    setIsDragging(false);
  }

  function handleDragStart(event: any) {
    setIsDragging(true);
  }

  // Service, stream type, and resource options
  const serviceOptions = Object.values(constants.SERVICE_DETAILS).map(
    (service) => ({ label: service.name, value: service.id })
  );
  const streamTypeOptions = (constants.STREAM_TYPES || []).map(
    (type: string) => ({ label: type, value: type })
  );
  const resourceOptions = (constants.RESOURCES || []).map((res: string) => ({
    label: res,
    value: res,
  }));
  const activeFilterCount =
    serviceFilters.length + streamTypeFilters.length + resourceFilters.length;

  // DND-kit setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  );

  useEffect(() => {
    function preventTouchMove(e: TouchEvent) {
      if (isDragging) {
        e.preventDefault();
      }
    }

    function handleDragEnd() {
      setIsDragging(false);
    }
    if (isDragging) {
      document.body.addEventListener('touchmove', preventTouchMove, {
        passive: false,
      });
      // Add listeners for when drag ends outside context
      document.addEventListener('pointerup', handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);
    } else {
      document.body.removeEventListener('touchmove', preventTouchMove);
    }
    return () => {
      document.body.removeEventListener('touchmove', preventTouchMove);
      document.removeEventListener('pointerup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);
  return (
    <>
      <div className="flex items-center w-full">
        <div>
          <h2>Addons</h2>
          <p className="text-[--muted]">
            Add your addons here. Choose from the marketplace below.
          </p>
        </div>
        <div className="flex flex-1"></div>
      </div>

      {/* Marketplace Section */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="w-full sm:w-[500px] flex gap-2">
            <TextInput
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              placeholder="Search addons..."
              className="flex-1"
              leftIcon={<SearchIcon className="w-4 h-4" />}
            />
            <AddonFilterPopover
              serviceOptions={serviceOptions}
              streamTypeOptions={streamTypeOptions}
              resourceOptions={resourceOptions}
              serviceFilters={serviceFilters}
              setServiceFilters={setServiceFilters}
              streamTypeFilters={streamTypeFilters}
              setStreamTypeFilters={setStreamTypeFilters}
              resourceFilters={resourceFilters}
              setResourceFilters={setResourceFilters}
            >
              <IconButton
                icon={<FilterIcon className="w-5 h-5" />}
                intent={activeFilterCount > 0 ? 'primary' : 'primary-outline'}
                aria-label="Filters"
              />
            </AddonFilterPopover>
          </div>
        </div>
        {/* Scrollable Addon Cards Grid */}
        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPresets.map((preset: any) => {
              // Always allow adding, never show edit
              return (
                <AddonCard
                  key={preset.ID}
                  preset={preset}
                  isAdded={false}
                  onAdd={() => handleAddPreset(preset)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Addon Modal */}
      <AddonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        presetMetadata={modalPreset}
        initialValues={modalInitialValues as any}
        onSubmit={handleModalSubmit}
      />

      {/* My Addons Section */}
      <SettingsCard
        title="My Addons"
        description="Manage your enabled addons. Drag to reorder."
      >
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext
            items={userData.presets.map((a) => getPresetUniqueKey(a))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              <ul className="space-y-2">
                {userData.presets.length === 0 ? (
                  <li>
                    <div className="flex flex-col items-center justify-center py-12">
                      <span className="text-lg text-muted-foreground font-semibold text-center">
                        Looks like you don't have any addons.
                        <br />
                        Add some from the marketplace above.
                      </span>
                    </div>
                  </li>
                ) : (
                  userData.presets.map((addon) => {
                    const preset = status?.settings?.presets.find(
                      (p: any) => p.ID === addon.id
                    );
                    return (
                      <SortableAddonItem
                        key={getPresetUniqueKey(addon)}
                        addon={addon}
                        preset={preset}
                        onEdit={() => {
                          setModalPreset(preset);
                          setModalInitialValues({
                            options: { ...addon.options },
                          });
                          setModalMode('edit');
                          setEditingAddonId(getPresetUniqueKey(addon));
                          setModalOpen(true);
                        }}
                        onRemove={() => {
                          setUserData((prev) => ({
                            ...prev,
                            presets: prev.presets.filter(
                              (a) =>
                                getPresetUniqueKey(a) !==
                                getPresetUniqueKey(addon)
                            ),
                          }));
                        }}
                        onToggleEnabled={(v: boolean) => {
                          setUserData((prev) => ({
                            ...prev,
                            presets: prev.presets.map((a) =>
                              getPresetUniqueKey(a) ===
                              getPresetUniqueKey(addon)
                                ? { ...a, enabled: v }
                                : a
                            ),
                          }));
                        }}
                      />
                    );
                  })
                )}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      </SettingsCard>
    </>
  );
}

// Helper to generate a unique key for a user preset
function getPresetUniqueKey(preset: {
  id: string;
  enabled: boolean;
  options: Record<string, any>;
}) {
  return JSON.stringify({
    id: preset.id,
    enabled: preset.enabled,
    options: preset.options,
  });
}

// Sortable Addon Item for DND (handles both preset and custom addon)
function SortableAddonItem({
  addon,
  preset,
  onEdit,
  onRemove,
  onToggleEnabled,
}: {
  addon: any;
  preset: any;
  onEdit: () => void;
  onRemove: () => void;
  onToggleEnabled: (v: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getPresetUniqueKey(addon),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <div className="px-2.5 py-2 bg-[var(--background)] rounded-[--radius-md] border flex gap-3 relative">
        <div
          className="rounded-full w-6 h-auto bg-[--muted] md:bg-[--subtle] md:hover:bg-[--subtle-highlight] cursor-move"
          {...attributes}
          {...listeners}
        />

        <div className="flex-1 flex items-center">
          <p className="text-base line-clamp-1">{addon.options.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch value={addon.enabled} onValueChange={onToggleEnabled} />
          <IconButton
            className="rounded-full"
            icon={<BiEdit />}
            intent="primary-subtle"
            onClick={onEdit}
          />
          <IconButton
            className="rounded-full"
            icon={<BiTrash />}
            intent="alert-subtle"
            onClick={onRemove}
          />
        </div>
      </div>
    </li>
  );
}

// AddonCard component
function AddonCard({
  preset,
  isAdded,
  onAdd,
}: {
  preset: any;
  isAdded: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col min-h-72 h-auto bg-[--background] border border-[--border] rounded-lg shadow-sm p-4 relative">
      {/* Top: Logo + Name/Description */}
      <div className="flex gap-4 items-start">
        {preset.ID === 'custom' ? (
          <div className="w-28 h-28 min-w-[7rem] min-h-[7rem] flex items-center justify-center rounded-lg bg-gray-900 text-[--brand] text-4xl">
            <PlusIcon className="w-12 h-12" />
          </div>
        ) : (
          <img
            src={preset.LOGO}
            alt={preset.NAME}
            className="w-28 h-28 min-w-[7rem] min-h-[7rem] object-cover rounded-lg bg-gray-800"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="font-bold text-lg mb-1 truncate">{preset.NAME}</div>
          <div className="text-sm text-muted-foreground mb-2 line-clamp-3 whitespace-pre-line">
            {preset.DESCRIPTION}
          </div>
        </div>
      </div>
      {/* Tags Section */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex flex-wrap gap-1 items-center min-h-[1.5rem]">
          {preset.SUPPORTED_SERVICES?.length > 0 && (
            <span className="font-semibold text-xs text-[--muted] mr-1">
              Services:
            </span>
          )}
          {preset.SUPPORTED_SERVICES?.map((sid: string) => (
            <span
              key={sid}
              className="bg-gray-800 text-xs px-2 py-0.5 rounded text-[--brand] font-mono"
            >
              {constants.SERVICE_DETAILS[
                sid as keyof typeof constants.SERVICE_DETAILS
              ]?.shortName || sid}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 items-center min-h-[1.5rem]">
          {preset.SUPPORTED_RESOURCES?.length > 0 && (
            <span className="font-semibold text-xs text-[--muted] mr-1">
              Resources:
            </span>
          )}
          {preset.SUPPORTED_RESOURCES?.map((res: string) => (
            <span
              key={res}
              className="bg-gray-800 text-xs px-2 py-0.5 rounded text-blue-400 font-mono"
            >
              {res}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 items-center min-h-[1.5rem]">
          {preset.SUPPORTED_STREAM_TYPES?.length > 0 && (
            <span className="font-semibold text-xs text-[--muted] mr-1">
              Stream Types:
            </span>
          )}
          {preset.SUPPORTED_STREAM_TYPES?.map((type: string) => (
            <span
              key={type}
              className="bg-gray-800 text-xs px-2 py-0.5 rounded text-green-400 font-mono"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      {/* Button at bottom */}
      <div className="mt-auto pt-3 flex items-end">
        <Button size="md" className="w-full" onClick={onAdd}>
          Add Addon
        </Button>
      </div>
    </div>
  );
}

function AddonModal({
  open,
  onOpenChange,
  mode,
  presetMetadata,
  initialValues = {},
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'add' | 'edit';
  presetMetadata?: any;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  useEffect(() => {
    setValues(initialValues);
  }, [open, initialValues]);
  const dynamicOptions: Option[] = presetMetadata?.OPTIONS || [];

  // Check if all required fields are filled
  const allRequiredFilled = dynamicOptions.every((opt: any) => {
    if (!opt.required) return true;
    const val = values.options?.[opt.id];
    // For booleans, false is valid; for others, check for empty string/null/undefined
    if (opt.type === 'boolean') return typeof val === 'boolean';
    return val !== undefined && val !== null && val !== '';
  });

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const opt of dynamicOptions) {
      if (opt.constraints) {
        const val = values.options?.[opt.id];
        if (typeof val === 'string') {
          if (opt.constraints.min && val.length < opt.constraints.min) {
            toast.error(
              `${opt.name} must be at least ${opt.constraints.min} characters`
            );
            return false;
          }
          if (opt.constraints.max && val.length > opt.constraints.max) {
            toast.error(
              `${opt.name} must be at most ${opt.constraints.max} characters`
            );
            return false;
          }
        } else if (typeof val === 'number') {
          if (opt.constraints.min && val < opt.constraints.min) {
            toast.error(`${opt.name} must be at least ${opt.constraints.min}`);
            return false;
          }
          if (opt.constraints.max && val > opt.constraints.max) {
            toast.error(`${opt.name} must be at most ${opt.constraints.max}`);
            return false;
          }
        }
      }
    }
    if (allRequiredFilled) {
      onSubmit(values);
    } else {
      toast.error('Please fill in all required fields');
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === 'add'
          ? `Add ${presetMetadata?.NAME}`
          : `Edit ${presetMetadata?.NAME}`
      }
    >
      <form className="space-y-4" onSubmit={handleFormSubmit}>
        {dynamicOptions.map((opt: any) => (
          <div key={opt.id} className="mb-2">
            <TemplateOption
              option={opt}
              value={values.options?.[opt.id]}
              onChange={(v: any) =>
                setValues((val) => ({
                  ...val,
                  options: { ...val.options, [opt.id]: v },
                }))
              }
              disabled={false}
            />
          </div>
        ))}
        <Button
          className="w-full mt-2"
          type="submit"
          disabled={!allRequiredFilled}
        >
          {mode === 'add' ? 'Add' : 'Update'}
        </Button>
      </form>
    </Modal>
  );
}

function AddonFilterPopover({
  serviceOptions,
  streamTypeOptions,
  resourceOptions,
  serviceFilters,
  setServiceFilters,
  streamTypeFilters,
  setStreamTypeFilters,
  resourceFilters,
  setResourceFilters,
  children,
}: any) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      modal={false}
      className="p-4 max-w-full w-full"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex flex-col max-h-60 overflow-y-auto">
            <div className="mb-2 font-semibold text-sm text-muted-foreground">
              Services
            </div>
            {serviceOptions.map((opt: any) => (
              <div
                key={opt.value}
                className="flex items-center gap-2 mb-2 last:mb-0"
              >
                <Switch
                  value={serviceFilters.includes(opt.value)}
                  onValueChange={(checked: boolean) => {
                    setServiceFilters((prev: string[]) =>
                      checked
                        ? [...prev, opt.value]
                        : prev.filter((v) => v !== opt.value)
                    );
                  }}
                  size="sm"
                />
                <span className="text-xs">{opt.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col max-h-60 overflow-y-auto">
            <div className="mb-2 font-semibold text-sm text-muted-foreground">
              Stream Types
            </div>
            {streamTypeOptions.map((opt: any) => (
              <div
                key={opt.value}
                className="flex items-center gap-2 mb-2 last:mb-0"
              >
                <Switch
                  value={streamTypeFilters.includes(opt.value)}
                  onValueChange={(checked: boolean) => {
                    setStreamTypeFilters((prev: string[]) =>
                      checked
                        ? [...prev, opt.value]
                        : prev.filter((v) => v !== opt.value)
                    );
                  }}
                  size="sm"
                />
                <span className="text-xs">{opt.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col max-h-60 overflow-y-auto">
            <div className="mb-2 font-semibold text-sm text-muted-foreground">
              Resources
            </div>
            {resourceOptions.map((opt: any) => (
              <div
                key={opt.value}
                className="flex items-center gap-2 mb-2 last:mb-0"
              >
                <Switch
                  value={resourceFilters.includes(opt.value)}
                  onValueChange={(checked: boolean) => {
                    setResourceFilters((prev: string[]) =>
                      checked
                        ? [...prev, opt.value]
                        : prev.filter((v) => v !== opt.value)
                    );
                  }}
                  size="sm"
                />
                <span className="text-xs">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
        <Button className="w-full mt-2" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </Popover>
  );
}
