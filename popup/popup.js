// Settings page (toolbar popup, options page, and the welcome tab on install).
// Saves on every change.
(function () {
  const NS = globalThis.CPSidekick;
  const statusNode = document.getElementById("status");
  const previewNode = document.getElementById("preview");
  const autoSend = document.getElementById("autoSend");
  const autoSendRow = document.getElementById("autoSendRow");
  const autoSendNote = document.getElementById("autoSendNote");
  let statusTimer = null;
  let current = null;

  if (new URLSearchParams(location.search).has("welcome")) {
    document.getElementById("welcome").hidden = false;
    document.getElementById("hint").hidden = true;
    document.body.classList.add("tab");
  }

  const showStatus = (text) => {
    statusNode.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusNode.textContent = "";
    }, 1500);
  };

  const render = () => {
    previewNode.textContent = NS.buttonLabel(current.mode, NS.providers.buttonName(current.provider));

    // Google AI Mode runs as soon as it opens; Debug/Refine always wait for pasted code.
    // In both cases the auto-send toggle doesn't apply.
    const urlHandoff = NS.providers.usesUrlHandoff(current.provider);
    const waitsForCode = NS.needsCode(current.mode);
    autoSend.disabled = urlHandoff || waitsForCode;
    autoSendRow.classList.toggle("disabled", autoSend.disabled);
    autoSendNote.textContent = urlHandoff
      ? "Google AI Mode always runs right away."
      : waitsForCode
        ? `${NS.promptModes[NS.resolveMode(current.mode)].label} never sends: it waits for you to paste your code.`
        : "Off: the prompt is filled in and you press Enter.";
  };

  const radioGroup = (container, name, options, selected) => {
    container.replaceChildren();
    options.forEach(({ value, label, description }) => {
      const row = document.createElement("label");
      row.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = value;
      input.checked = value === selected;

      const text = document.createElement("span");
      const title = document.createElement("span");
      title.className = "option-title";
      title.textContent = label;
      text.appendChild(title);
      if (description) {
        const desc = document.createElement("span");
        desc.className = "option-desc";
        desc.textContent = description;
        text.appendChild(desc);
      }

      row.append(input, text);
      container.appendChild(row);
    });
  };

  const save = async (patch) => {
    current = { ...current, ...patch };
    render();
    const ok = await NS.settings.save(patch);
    showStatus(ok ? "Saved" : "Could not save settings");
  };

  NS.settings.load().then((settings) => {
    current = settings;
    radioGroup(
      document.getElementById("modes"),
      "mode",
      Object.entries(NS.promptModes).map(([value, mode]) => ({
        value,
        label: mode.label,
        description: mode.description
      })),
      settings.mode
    );
    radioGroup(
      document.getElementById("providers"),
      "provider",
      Object.values(NS.providers.all).map((p) => ({ value: p.id, label: p.label, description: p.note })),
      settings.provider
    );

    autoSend.checked = settings.autoSend;
    render();

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target.name === "provider") save({ provider: target.value });
      else if (target.name === "mode") save({ mode: target.value });
      else if (target.id === "autoSend") save({ autoSend: target.checked });
    });
  });
})();
