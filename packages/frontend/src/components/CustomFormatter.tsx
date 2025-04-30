import React, { useState, useEffect, useRef } from 'react';
import styles from './CustomFormatter.module.css';

interface CustomFormatterProps {
  formatter: string;
  setFormatter: (formatter: string) => void;
}

const CustomFormatter: React.FC<CustomFormatterProps> = ({
  formatter,
  setFormatter,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customNameSyntax, setCustomNameSyntax] = useState('');
  const [customDescSyntax, setCustomDescSyntax] = useState('');
  const initialLoadDone = useRef(false);

  // Load the existing formatter on component mount
  useEffect(() => {
    if (
      !initialLoadDone.current &&
      formatter &&
      formatter.startsWith('custom:')
    ) {
      try {
        // Extract the JSON part from the formatter string
        const jsonStr = formatter.substring(7); // Remove 'custom:'
        const formatterData = JSON.parse(jsonStr);

        // Set the initial values
        if (formatterData.name) {
          setCustomNameSyntax(formatterData.name);
        }

        if (formatterData.description) {
          setCustomDescSyntax(formatterData.description);
        }
      } catch (error) {
        console.error('Failed to parse custom formatter:', error);
      }
      initialLoadDone.current = true;
    }
  }, [formatter]);

  useEffect(() => {
    // Skip the first render to avoid overwriting the initial formatter
    if (!initialLoadDone.current) {
      return;
    }

    // Only update formatter when user changes the inputs
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
            Define a custom formatter syntax. Write
            <code>{'{debug.jsonf}'}</code> to see the available variables.
            <br />
            For a more detailed explanation, check the{' '}
            <a href="https://github.com/Viren070/AIOStreams/wiki/Custom-Formatter">
              wiki
            </a>
            <br />
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Name Format:</label>
            <textarea
              className={styles.syntaxInput}
              value={customNameSyntax}
              onChange={(e) => setCustomNameSyntax(e.target.value)}
              placeholder="E.g.: {addon.name}"
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description Format:</label>
            <textarea
              className={styles.syntaxInput}
              value={customDescSyntax}
              onChange={(e) => setCustomDescSyntax(e.target.value)}
              placeholder="E.g.: {stream.name}"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFormatter;
