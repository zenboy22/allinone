import { TextInput } from '../ui/text-input';
import { NumberInput } from '../ui/number-input';
import { Switch } from '../ui/switch';
import { Select } from '../ui/select';
import { Combobox } from '../ui/combobox';
import { Option } from '@aiostreams/core';
import React from 'react';
import MarkdownLite from './markdown-lite';
// this component, accepts an option and returns a component that renders the option.
// string - TextInput
// number - NumberInput
// boolean - Checkbox
// select - Select
// multi-select - ComboBox
// url - TextInput (with url validation)

// Props for the template option component
interface TemplateOptionProps {
  option: Option;
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
}

const TemplateOption: React.FC<TemplateOptionProps> = ({
  option,
  value,
  onChange,
  disabled,
}) => {
  const {
    id,
    name,
    description,
    type,
    required,
    options,
    constraints,
    emptyIsUndefined = false,
  } = option;

  const isDisabled = disabled;

  switch (type) {
    case 'string':
      return (
        <div>
          <TextInput
            label={name}
            value={value}
            onValueChange={(value: string) =>
              onChange(emptyIsUndefined ? value || undefined : value)
            }
            required={required}
            minLength={constraints?.min}
            maxLength={constraints?.max}
            disabled={isDisabled}
          />
          {description && (
            <div className="text-xs text-[--muted] mt-1">
              <MarkdownLite>{description}</MarkdownLite>
            </div>
          )}
        </div>
      );
    case 'number':
      return (
        <div>
          <NumberInput
            value={value}
            label={name}
            onValueChange={(value: number, valueAsString: string) =>
              onChange(value)
            }
            required={required}
            min={constraints?.min}
            max={constraints?.max}
            disabled={isDisabled}
          />
          {description && (
            <div className="text-xs text-[--muted] mt-1">
              <MarkdownLite>{description}</MarkdownLite>
            </div>
          )}
        </div>
      );
    case 'boolean':
      return (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">{name}</span>
            <Switch value={!!value} onValueChange={onChange} />
          </div>
          {description && (
            <div className="text-xs text-[--muted] mt-1">
              <MarkdownLite>{description}</MarkdownLite>
            </div>
          )}
        </div>
      );
    case 'select':
      return (
        <div>
          <Select
            label={name}
            value={value}
            onValueChange={onChange}
            options={
              options?.map((opt) => ({ label: opt.label, value: opt.value })) ??
              []
            }
            required={required}
            disabled={isDisabled}
          />
          {description && (
            <div className="text-xs text-[--muted] mt-1">{description}</div>
          )}
        </div>
      );
    case 'multi-select':
      return (
        <div>
          <Combobox
            label={name}
            value={Array.isArray(value) ? value : undefined}
            onValueChange={(value: any) =>
              onChange(
                emptyIsUndefined
                  ? value?.length === 0
                    ? undefined
                    : value
                  : value
              )
            }
            options={
              options?.map((opt) => ({
                label: opt.label,
                value: opt.value,
                textValue: opt.label,
              })) ?? []
            }
            multiple
            emptyMessage="No options"
            disabled={isDisabled}
            required={required}
          />
          {description && (
            <div className="text-xs text-[--muted] mt-1">
              <MarkdownLite>{description}</MarkdownLite>
            </div>
          )}
        </div>
      );
    case 'url':
      return (
        <div>
          <TextInput
            label={name}
            value={value}
            onValueChange={(value: string) =>
              onChange(emptyIsUndefined ? value || undefined : value)
            }
            required={required}
            type="url"
            disabled={isDisabled}
          />
          {description && (
            <div className="text-xs text-[--muted] mt-1">
              <MarkdownLite>{description}</MarkdownLite>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
};

export default TemplateOption;
