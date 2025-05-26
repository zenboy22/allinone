import { BaseFormatter, FormatterConfig } from './base';

export class CustomFormatter extends BaseFormatter {
  constructor(nameTemplate: string, descriptionTemplate: string) {
    super({
      name: nameTemplate,
      description: descriptionTemplate,
    });
  }

  public static fromConfig(config: FormatterConfig): CustomFormatter {
    return new CustomFormatter(config.name, config.description);
  }

  public updateTemplate(
    nameTemplate: string,
    descriptionTemplate: string
  ): void {
    this.config = {
      name: nameTemplate,
      description: descriptionTemplate,
    };
  }

  public getTemplate(): FormatterConfig {
    return this.config;
  }
}
