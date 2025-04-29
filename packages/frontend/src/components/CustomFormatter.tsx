import React, { useState, useEffect } from 'react';
import styles from './CustomFormatter.module.css';

interface CustomFormatterProps {
  setFormatter: (formatter: string) => void;
}

const CustomFormatter: React.FC<CustomFormatterProps> = ({ setFormatter }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customNameSyntax, setCustomNameSyntax] = useState('');
  const [customDescSyntax, setCustomDescSyntax] = useState('');

  useEffect(() => {
    // If both fields have content, update the formatter
    const formatterData = {
      name: customNameSyntax,
      description: customDescSyntax,
    };
    setFormatter(`custom:${JSON.stringify(formatterData)}`);
  }, [customNameSyntax, customDescSyntax, setFormatter]);

  return (
    <div className={styles.customFormatterContainer}>
      <h3
        className={styles.customFormatterTitle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Custom Formatter
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '►'}</span>
      </h3>

      {isExpanded && (
        <div className={styles.customFormatterContent}>
          <p className={styles.customFormatterDescription}>
            Define a custom formatter syntax. You can use any of the following
            variables:
            <br />
            <code>{'{resolution}'}</code>, <code>{'{quality}'}</code>,{' '}
            <code>{'{size}'}</code>,<code>{'{language}'}</code>,{' '}
            <code>{'{visualTag}'}</code>, <code>{'{audioTag}'}</code>,
            <code>{'{service}'}</code>, <code>{'{seeders}'}</code>,{' '}
            <code>{'{addon}'}</code>,<code>{'{encode}'}</code>
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Name Format:</label>
            <textarea
              className={styles.syntaxInput}
              value={customNameSyntax}
              onChange={(e) => setCustomNameSyntax(e.target.value)}
              placeholder="E.g.: {resolution} {visualTag} {language}"
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description Format:</label>
            <textarea
              className={styles.syntaxInput}
              value={customDescSyntax}
              onChange={(e) => setCustomDescSyntax(e.target.value)}
              placeholder="E.g.: {size} | {quality} | {encode} | {audioTag} | {seeders} seeders | {addon}"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFormatter;
