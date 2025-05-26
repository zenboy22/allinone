import React from 'react';
import { Modal } from '@/components/ui/modal';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { UserConfigAPI } from '@/services/api';
import { useUserData } from '@/context/userData';

interface ConfigModalProps {
  open: boolean;
  onSuccess: () => void;
  onOpenChange: (v: boolean) => void;
  initialUuid?: string;
}

{
  /* <Modal
title="Load Config"
open={loadConfigModal.isOpen}
onOpenChange={loadConfigModal.close}
>
<div className="mt-5 text-center space-y-4">
  <TextInput
    label="Config ID"
    placeholder="Enter config ID"
    value={configId}
    onChange={(e) => setConfigId(e.target.value)}
  />

</div>
</Modal> */
}

export function ConfigModal({
  open,
  onSuccess,
  onOpenChange,
  initialUuid,
}: ConfigModalProps) {
  const { setUserData, setUuid, setPassword } = useUserData();
  const [uuid, setUuidInput] = React.useState(initialUuid || '');
  const [password, setPasswordInput] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  console.log(`received initialUuid: ${initialUuid}`);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await UserConfigAPI.loadConfig(uuid, password);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load configuration');
        return;
      }

      setUserData(result.data.config);
      setUuid(uuid);
      setPassword(password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setPasswordInput('');
      setError('');
    }
  }, [open]);

  // Handle initialUuid changes
  React.useEffect(() => {
    if (initialUuid) {
      setUuidInput(initialUuid);
    } else {
      setUuidInput('');
    }
  }, [initialUuid]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Load Configuration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <TextInput
            label="UUID"
            id="uuid"
            value={uuid}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUuidInput(e.target.value)
            }
            placeholder="Enter your configuration UUID"
            required
            disabled={!!initialUuid}
          />
        </div>
        <div>
          <TextInput
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPasswordInput(e.target.value)
            }
            placeholder="Enter your configuration password"
            required
          />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Load
          </Button>
        </div>
      </form>
    </Modal>
  );
}
