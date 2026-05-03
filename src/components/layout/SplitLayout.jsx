export default function SplitLayout({ leftPanel, rightPanel }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      <div className="h-[55vh] md:h-full md:w-[58%] overflow-y-auto border-b border-[var(--color-border)] md:border-b-0 md:border-l bg-[var(--color-surface)]">
        {leftPanel}
      </div>
      <div className="h-[45vh] md:h-full md:w-[42%] overflow-hidden flex flex-col bg-[var(--color-surface-alt)]">
        {rightPanel}
      </div>
    </div>
  );
}
