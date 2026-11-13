import { demoById, DEMOS } from "./demos";
import { journalToCsv } from "./journal";
import { reconcileCsv } from "./reconcile";
import { renderEmpty, renderOutcome, renderShell } from "./render";
import type { Journal } from "./types";

let currentJournal: Journal | null = null;

function resultNode(): HTMLElement {
  const node = document.getElementById("result");
  if (!node) throw new Error("Missing result region");
  return node;
}

function present(csv: string, filename: string): void {
  const outcome = reconcileCsv(csv, filename);
  currentJournal = outcome.ok ? outcome.journal : null;
  const region = resultNode();
  region.replaceChildren(renderOutcome(outcome));
  document.getElementById("export-journal")?.addEventListener("click", () => {
    if (!currentJournal) return;
    const csvText = journalToCsv(currentJournal);
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentJournal.filename;
    link.click();
    URL.revokeObjectURL(url);
    const status = document.getElementById("export-status");
    if (status) {
      const balanced =
        currentJournal.debitCents === currentJournal.creditCents
          ? "Debits equal credits."
          : "Debits do not equal credits.";
      status.textContent = `Exported ${currentJournal.filename}. ${currentJournal.lines.length} lines. ${balanced}`;
    }
  });
}

function readFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : "";
    present(text, file.name);
  };
  reader.onerror = () => {
    currentJournal = null;
    resultNode().replaceChildren(renderEmpty());
    const note = document.createElement("p");
    note.className = "error-panel";
    note.textContent = "That file could not be read.";
    resultNode().append(note);
  };
  reader.readAsText(file);
}

export function startApp(root: HTMLElement): void {
  root.replaceChildren(renderShell(DEMOS.map((demo) => ({ id: demo.id, label: demo.label }))));

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("button[data-demo]");
    if (!button) return;
    const demo = demoById(button.getAttribute("data-demo") ?? "");
    if (!demo) return;
    present(demo.csv, demo.filename);
  });

  const input = document.getElementById("payout-file");
  input?.addEventListener("change", () => {
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (file) readFile(file);
  });

  window.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) readFile(file);
  });

  const sample = new URLSearchParams(window.location.search).get("sample");
  if (sample) {
    const demo = demoById(sample);
    if (demo) present(demo.csv, demo.filename);
  }
}

const root = document.getElementById("app");
if (root) startApp(root);
