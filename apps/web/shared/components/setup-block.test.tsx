import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupBlock } from "./setup-block";

describe("SetupBlock", () => {
  it("shows the title, what it holds, and its control", () => {
    render(
      <SetupBlock title="Fichiers et pages Notion" description="3 fichiers lus">
        <button type="button">Gérer</button>
      </SetupBlock>,
    );

    expect(screen.getByText("Fichiers et pages Notion")).toBeInTheDocument();
    expect(screen.getByText("3 fichiers lus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gérer" })).toBeInTheDocument();
  });

  // The point of the whole component: an empty input names what stays blocked
  // rather than announcing a void, which is what carries the hierarchy.
  it("names what stays blocked while it is empty", () => {
    render(
      <SetupBlock
        title="Fichiers et pages Notion"
        feeds={{
          label: "Alimente ce que lit votre client",
          state: "En attente",
          tone: "waiting",
        }}
      >
        <button type="button">Ajouter</button>
      </SetupBlock>,
    );

    expect(screen.getByText("Alimente ce que lit votre client")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("lights the same line up once the input is live", () => {
    render(
      <SetupBlock
        title="Votre board"
        feeds={{ label: "Alimente l'avancement", state: "En service", tone: "live" }}
      >
        <button type="button">Gérer</button>
      </SetupBlock>,
    );

    const line = screen.getByText("Alimente l'avancement").closest("p");
    expect(line).toHaveClass("text-fg");
  });

  it("keeps a waiting line quiet", () => {
    render(
      <SetupBlock
        title="Votre board"
        feeds={{ label: "Alimente l'avancement", state: "En attente", tone: "waiting" }}
      >
        <button type="button">Connecter</button>
      </SetupBlock>,
    );

    const line = screen.getByText("Alimente l'avancement").closest("p");
    expect(line).not.toHaveClass("text-fg");
    expect(line).toHaveClass("text-fg-3");
  });

  // FR-009: a source whose state cannot be read must render as unknown, never
  // as absent — an outage must not tell a developer their pages are gone.
  it("says unknown rather than empty when the state could not be read", () => {
    render(
      <SetupBlock
        title="Fichiers et pages Notion"
        feeds={{
          label: "Alimente ce que lit votre client",
          state: "État inconnu",
          tone: "unknown",
        }}
      >
        <button type="button">Réessayer</button>
      </SetupBlock>,
    );

    expect(screen.getByText("État inconnu")).toBeInTheDocument();
    const line = screen.getByText("Alimente ce que lit votre client").closest("p");
    expect(line).not.toHaveClass("text-fg");
  });

  // The meeting link and the preferences block nothing, so they get no line at
  // all rather than an empty one that would read as a fourth thing to do.
  it("renders no line for a control that feeds nothing", () => {
    const { container } = render(
      <SetupBlock title="Réunions" description="Aucun lien">
        <button type="button">Ajouter</button>
      </SetupBlock>,
    );

    expect(container.querySelector("p")).toBeNull();
  });
});
