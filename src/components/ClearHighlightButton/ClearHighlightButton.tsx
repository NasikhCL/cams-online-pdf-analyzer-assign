import { usePdf } from '../../context/usePdf';
import styles from './ClearHighlightButton.module.css';

export function ClearHighlightButton() {
  const { selectedFieldId, setSelectedFieldId } = usePdf();
  const visible = !!selectedFieldId;

  return (
    <div
      className={`${styles.wrapper} ${visible ? '' : styles.wrapperHidden}`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className={styles.button}
        onClick={() => setSelectedFieldId(null)}
        tabIndex={visible ? 0 : -1}
      >
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
        Clear highlight
      </button>
    </div>
  );
}
