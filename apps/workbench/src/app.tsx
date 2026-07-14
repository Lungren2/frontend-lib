import { ui } from "@frontend-lib/registry";
import registry from "../../../registry.json";
import { useMemo, useState } from "react";

type RegistryItem = (typeof registry.items)[number];

const components = registry.items.filter(
  (item): item is RegistryItem & { type: "registry:ui" } =>
    item.type === "registry:ui",
);

function commandFor(selected: string[]) {
  const items = selected.join(" ");
  return `frontend-lib add ${items} --registry ./registry.json`;
}

export function App() {
  const [selected, setSelected] = useState<string[]>(["button"]);
  const selectedItems = useMemo(
    () => components.filter((component) => selected.includes(component.name)),
    [selected],
  );

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  return (
    <main className="workbench">
      <section className="workbench__catalog" aria-label="Component catalog">
        <div className="workbench__bar">
          <p className="workbench__eyebrow">Frontend Lib</p>
          <output aria-live="polite">{selected.length} selected</output>
        </div>

        <div className="workbench__catalog-grid">
          <nav aria-label="Available components">
            <ul className="workbench__component-list">
              {components.map((component) => {
                const isSelected = selected.includes(component.name);
                return (
                  <li key={component.name}>
                    <label className="workbench__component-option">
                      <input
                        checked={isSelected}
                        onChange={() => toggle(component.name)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{component.title}</strong>
                        <small>{component.description}</small>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="workbench__preview" aria-label="Button preview">
            <div className="workbench__preview-heading">
              <div>
                <p className="workbench__eyebrow">Preview</p>
                <h1>Button</h1>
              </div>
              <code>ui.button</code>
            </div>
            <div className="workbench__button-grid">
              <ui.button>Primary action</ui.button>
              <ui.button variant="secondary">Secondary action</ui.button>
              <ui.button variant="ghost">Quiet action</ui.button>
              <ui.button disabled>Unavailable</ui.button>
            </div>
          </section>
        </div>
      </section>

      <aside className="workbench__install" aria-label="Installation plan">
        <div>
          <p className="workbench__eyebrow">Install with the CLI</p>
          <h2>
            {selectedItems.map((item) => item.title).join(", ") ||
              "Nothing selected"}
          </h2>
        </div>
        <code className="workbench__command">
          {selected.length
            ? commandFor(selected)
            : "Select a component to continue"}
        </code>
        <p className="workbench__notice">
          Review the CLI plan before it writes to a consumer project.
        </p>
      </aside>
    </main>
  );
}
