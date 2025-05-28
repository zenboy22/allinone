'use client';
import { useStatus } from '@/context/status';
import { PageWrapper } from '../shared/page-wrapper';
import {
  SERVICE_DETAILS,
  ServiceId,
} from '../../../../core/src/utils/constants';
import { useUserData } from '@/context/userData';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton } from '../ui/button';
import { FiSettings } from 'react-icons/fi';
import { Switch } from '../ui/switch';
import { Modal } from '../ui/modal';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import TemplateOption from '../shared/template-option';
import { Button } from '../ui/button';
import MarkdownLite from '../shared/markdown-lite';
import { Alert } from '../ui/alert';

export function ServicesMenu() {
  return (
    <>
      <PageWrapper className="space-y-4 p-4 sm:p-8">
        <Content />
      </PageWrapper>
    </>
  );
}

// we  show all services, along with its signUpText and a setting icon button, and switch to enable/disable the service.
// this will be in a sortable lis twith dnd, similar to the addons menu.
// when the setting icon button is clicked, it will open a modal with all the credentials (option definitions) for the service

//

function Content() {
  const status = useStatus();
  const { setUserData, userData } = useUserData();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalService, setModalService] = useState<ServiceId | null>(null);
  const [modalValues, setModalValues] = useState<Record<string, any>>({});
  const [alerts, setAlerts] = useState<string[]>([]);

  // DND logic
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setUserData((prev) => {
        const services = prev.services ?? [];
        const oldIndex = services.findIndex((s) => s.id === active.id);
        const newIndex = services.findIndex((s) => s.id === over.id);
        const newServices = arrayMove(services, oldIndex, newIndex);
        return { ...prev, services: newServices };
      });
    }
  }

  // Modal handlers
  const handleServiceClick = (service: ServiceId) => {
    setModalService(service);
    const svc = userData.services?.find((s) => s.id === service);
    setModalValues(svc?.credentials || {});
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setModalService(null);
    setModalValues({});
  };

  const handleModalSubmit = (values: Record<string, any>) => {
    setUserData((prev) => {
      const newUserData = { ...prev };
      newUserData.services = (newUserData.services ?? []).map((service) => {
        if (service.id === modalService) {
          return {
            ...service,
            credentials: values,
          };
        }
        return service;
      });
      return newUserData;
    });
    handleModalClose();
  };

  useEffect(() => {
    const allServiceIds = Object.keys(SERVICE_DETAILS);
    const currentServices = userData.services ?? [];
    // Remove any services not in SERVICE_DETAILS
    let filtered = currentServices.filter((s: { id: string }) =>
      allServiceIds.includes(s.id)
    );
    // Add any missing services from SERVICE_DETAILS
    const missing = allServiceIds.filter(
      (id) => !filtered.some((s: { id: string }) => s.id === id)
    );
    if (missing.length > 0 || filtered.length !== currentServices.length) {
      const toAdd = missing.map((id) => ({
        id,
        enabled: false,
        credentials: {},
      }));
      setUserData((prev: any) => ({
        ...prev,
        services: [...filtered, ...toAdd],
      }));
    }
  }, [userData.services, setUserData]);

  // Render
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
      {alerts.length > 0 && (
        <div className="mb-6">
          {alerts.map((alert) => (
            <Alert intent="alert" key={alert}>
              {alert}
            </Alert>
          ))}
        </div>
      )}
      <div className="bg-[--card] border border-[--border] rounded-xl p-4 mb-6 shadow-sm">
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={userData.services?.map((s) => s.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              <ul className="space-y-2">
                {(userData.services?.length ?? 0) === 0 ? (
                  <li>
                    <div className="flex flex-col items-center justify-center py-12">
                      <span className="text-lg text-muted-foreground font-semibold text-center">
                        Looks like you don't have any services configured.
                        <br />
                        Add and configure services above.
                      </span>
                    </div>
                  </li>
                ) : (
                  userData.services?.map((service, idx) => {
                    const svcMeta = SERVICE_DETAILS[service.id];
                    return (
                      <SortableServiceItem
                        key={service.id}
                        service={service}
                        meta={svcMeta}
                        onEdit={() => handleServiceClick(service.id)}
                        onToggleEnabled={(v: boolean) => {
                          // const existingService = userData.services?.find(
                          //   (s) => s.id === service.id
                          // );
                          // const missingCredentials = svcMeta.credentials.filter(
                          //   (cred) =>
                          //     !existingService?.credentials[
                          //       cred.id as keyof typeof existingService.credentials
                          //     ]
                          // );
                          // if (missingCredentials.length > 0 && v) {
                          //   setAlerts((prev) => [
                          //     ...prev,
                          //     `Please provide all required credentials for ${svcMeta.name}`,
                          //   ]);
                          // }
                          // setUserData((prev) => ({
                          //   ...prev,
                          //   services: (prev.services ?? []).map((s) =>
                          //     s.id === service.id ? { ...s, enabled: v } : s
                          //   ),
                          // }));
                          setUserData((prev) => {
                            const existingService = prev.services?.find(
                              (s) => s.id === service.id
                            );
                            if (!existingService) return prev;
                            const missingCredentials =
                              svcMeta.credentials.filter(
                                (cred) =>
                                  !existingService.credentials[
                                    cred.id as keyof typeof existingService.credentials
                                  ]
                              );
                            const alertMsg = `Please provide all required credentials for ${svcMeta.name}`;
                            if (missingCredentials.length > 0) {
                              if (v) {
                                if (!alerts.includes(alertMsg)) {
                                  setAlerts((prev) => [...prev, alertMsg]);
                                }
                              } else {
                                setAlerts((prev) =>
                                  prev.filter((a) => a !== alertMsg)
                                );
                              }
                            } else {
                              if (alerts.includes(alertMsg)) {
                                setAlerts((prev) =>
                                  prev.filter((a) => a !== alertMsg)
                                );
                              }
                            }
                            return {
                              ...prev,
                              services: (prev.services ?? []).map((s) =>
                                s.id === service.id ? { ...s, enabled: v } : s
                              ),
                            };
                          });
                        }}
                      />
                    );
                  })
                )}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <ServiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        serviceId={modalService}
        values={modalValues}
        onChange={setModalValues}
        onSubmit={handleModalSubmit}
        onClose={handleModalClose}
      />
    </>
  );
}

function SortableServiceItem({
  service,
  meta,
  onEdit,
  onToggleEnabled,
}: {
  service: any;
  meta: any;
  onEdit: () => void;
  onToggleEnabled: (v: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });
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
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="font-mono text-base truncate">
            {meta?.name || service.id}
          </span>
          <span className="text-sm text-[--muted] font-normal italic truncate">
            <MarkdownLite>{meta?.signUpText}</MarkdownLite>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Switch value={!!service.enabled} onValueChange={onToggleEnabled} />
          <IconButton
            icon={<FiSettings />}
            intent="primary-outline"
            onClick={onEdit}
          />
        </div>
      </div>
    </li>
  );
}

function ServiceModal({
  open,
  onOpenChange,
  serviceId,
  values,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  serviceId: ServiceId | null;
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  onSubmit: (v: Record<string, any>) => void;
  onClose: () => void;
}) {
  if (!serviceId) return null;
  const meta = SERVICE_DETAILS[serviceId];
  const credentials = meta.credentials || [];
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Configure ${meta.name}`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
      >
        {credentials.map((opt) => (
          <TemplateOption
            key={opt.id}
            option={opt}
            value={values[opt.id]}
            onChange={(v) => onChange({ ...values, [opt.id]: v })}
          />
        ))}
        <div className="flex gap-2">
          <Button type="submit" className="w-full">
            Save
          </Button>
          <Button
            type="button"
            className="w-full"
            intent="primary-outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
