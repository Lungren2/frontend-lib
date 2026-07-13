import { ui } from "@frontend-lib/registry";

export function App() {
  return (
    <main className="workbench">
      <section className="workbench__group" aria-labelledby="button-heading">
        <h1 id="button-heading">Button</h1>
        <div className="workbench__row">
          <ui.button>Primary</ui.button>
          <ui.button variant="secondary">Secondary</ui.button>
          <ui.button variant="ghost">Ghost</ui.button>
          <ui.button disabled>Disabled</ui.button>
        </div>
      </section>
    </main>
  );
}
