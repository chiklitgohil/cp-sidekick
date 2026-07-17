(function () {
  const root = window.CPSidekick;
  if (!root?.extractCodeforcesProblem || !root?.buildPrompt) return;
  if (document.querySelector(".cp-sidekick-button")) return;

  const copyPrompt = async (prompt) => {
    await navigator.clipboard.writeText(prompt);
  };

  const openProvider = (provider, problemUrl) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "CP_SIDEKICK_OPEN_LLM",
          provider,
          problemUrl
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false });
            return;
          }

          resolve(response || { ok: false });
        }
      );
    });

  const createModeOptions = (selectedMode) =>
    Object.entries(root.promptModes)
      .map(([key, mode]) => {
        const checked = key === selectedMode ? "checked" : "";
        return `<label class="cp-sidekick-option"><input type="radio" name="cp-mode" value="${key}" ${checked}> ${mode.label}</label>`;
      })
      .join("");

  const showDialog = () => {
    const problem = root.extractCodeforcesProblem();
    if (!problem.ok) {
      window.alert(problem.reason || "CP Sidekick could not read this problem page.");
      return;
    }

    let mode = "hints";
    let prompt = root.buildPrompt({ problem, mode });
    const backdrop = document.createElement("div");
    backdrop.className = "cp-sidekick-backdrop";
    backdrop.innerHTML = `
      <section class="cp-sidekick-dialog" role="dialog" aria-modal="true" aria-label="CP Sidekick prompt builder">
        <header class="cp-sidekick-header">
          <h2 class="cp-sidekick-title">Ask AI about ${problem.title}</h2>
          <button class="cp-sidekick-close" type="button" title="Close">x</button>
        </header>
        <div class="cp-sidekick-body">
          <div class="cp-sidekick-grid">${createModeOptions(mode)}</div>
          <label class="cp-sidekick-label">
            Optional code or notes
            <textarea class="cp-sidekick-user-code" rows="7" placeholder="Paste your solution attempt here when using review mode."></textarea>
          </label>
          <label class="cp-sidekick-label">
            Open with
            <select class="cp-sidekick-provider">
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
        </div>
        <footer class="cp-sidekick-footer">
          <span class="cp-sidekick-status" aria-live="polite"></span>
          <div>
            <button class="cp-sidekick-secondary" type="button" data-action="copy">Copy prompt</button>
            <button class="cp-sidekick-primary" type="button" data-action="copy-open">Copy & open</button>
          </div>
        </footer>
      </section>
    `;

    const codeInput = backdrop.querySelector(".cp-sidekick-user-code");
    const status = backdrop.querySelector(".cp-sidekick-status");
    const provider = backdrop.querySelector(".cp-sidekick-provider");

    const refreshPrompt = () => {
      prompt = root.buildPrompt({
        problem,
        mode,
        userCode: codeInput.value
      });
    };

    const setStatus = (message) => {
      status.textContent = message;
      window.setTimeout(() => {
        if (status.textContent === message) status.textContent = "";
      }, 3500);
    };

    backdrop.addEventListener("change", (event) => {
      if (event.target.name === "cp-mode") {
        mode = event.target.value;
        refreshPrompt();
      }
    });

    codeInput.addEventListener("input", refreshPrompt);

    backdrop.addEventListener("click", async (event) => {
      if (event.target === backdrop || event.target.classList.contains("cp-sidekick-close")) {
        backdrop.remove();
        return;
      }

      const action = event.target.dataset.action;
      if (!action) return;

      refreshPrompt();
      try {
        await copyPrompt(prompt);
        if (action === "copy-open") {
          const result = await openProvider(provider.value, problem.url);
          if (!result.ok) {
            setStatus("Prompt copied. Open the AI chat manually.");
            return;
          }

          setStatus(result.reused ? "Prompt copied. Switched to existing chat." : "Prompt copied. Opened AI chat.");
        } else {
          setStatus("Prompt copied.");
        }
      } catch (error) {
        setStatus("Copy failed. Please try again.");
      }
    });

    refreshPrompt();
    document.body.appendChild(backdrop);
    codeInput.focus();
  };

  const button = document.createElement("button");
  button.className = "cp-sidekick-button";
  button.type = "button";
  button.textContent = "Ask AI";
  button.addEventListener("click", showDialog);

  document.body.appendChild(button);
})();
