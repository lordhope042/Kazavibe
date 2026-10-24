(function () {
  const body = document.body;
  const toggle = document.querySelector('.sidebar-toggle');
  const backdrop = document.querySelector('.sidebar-backdrop');

  function closeSidebar() { body.classList.remove('sidebar-open'); }
  function toggleSidebar() { body.classList.toggle('sidebar-open'); }

  if (toggle) toggle.addEventListener('click', toggleSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
  document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', closeSidebar));

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSidebar();
  });
})();

/* Consistent accessible states, confirmations and responsive tables. */
(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // Make wide tables scrollable on narrow screens without hiding columns.
  $$('table').forEach(table => {
    if (table.closest('.table-wrap, .table-responsive')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Scrollable table');
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  // Consistent native accessible confirmation dialog for legacy inline confirms.
  let dialog = $('.confirm-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'tg-confirm-title');
    dialog.innerHTML = '<h2 id="tg-confirm-title">Please confirm</h2><p class="confirm-message"></p><div class="confirm-actions"><button type="button" data-cancel>Cancel</button><button type="button" class="confirm-danger" data-accept>Continue</button></div>';
    document.body.appendChild(dialog);
  }
  let resolveConfirmation;
  const message = $('.confirm-message', dialog);
  const cancel = $('[data-cancel]', dialog);
  const accept = $('[data-accept]', dialog);
  function askConfirmation(text) {
    message.textContent = text || 'Are you sure you want to continue?';
    dialog.showModal();
    cancel.focus();
    return new Promise(resolve => { resolveConfirmation = resolve; });
  }
  cancel.addEventListener('click', () => { dialog.close(); if (resolveConfirmation) resolveConfirmation(false); });
  accept.addEventListener('click', () => { dialog.close(); if (resolveConfirmation) resolveConfirmation(true); });
  dialog.addEventListener('close', () => { if (resolveConfirmation) { resolveConfirmation(false); resolveConfirmation = null; } });

  $$('[onclick]').forEach(element => {
    const code = element.getAttribute('onclick') || '';
    const match = code.match(/return\s+confirm\((['"`])([\s\S]*?)\1\)\s*;?/);
    if (!match) return;
    element.removeAttribute('onclick');
    element.addEventListener('click', async event => {
      event.preventDefault();
      const approved = await askConfirmation(match[2]);
      if (!approved) return;
      if (element.tagName === 'A') window.location.href = element.href;
      else if (element.form) element.form.requestSubmit(element);
    });
  });

  // Submit feedback prevents accidental repeated clicks and provides loading state.
  $$('form').forEach(form => {
    form.addEventListener('submit', () => {
      const submit = form.querySelector('button[type="submit"], input[type="submit"]');
      if (!submit || form.dataset.allowRepeat === 'true') return;
      submit.setAttribute('aria-busy', 'true');
      submit.dataset.originalText = submit.tagName === 'INPUT' ? submit.value : submit.textContent;
      if (submit.tagName === 'INPUT') submit.value = 'Please wait…';
      else submit.textContent = 'Please wait…';
      // Do not disable the control: disabled submit buttons are not submitted by the browser.
    }, { once: true });
  });

  // Accessible empty states for data tables with headers but no data rows.
  $$('table').forEach(table => {
    const body = table.tBodies[0];
    if (!body || body.rows.length || !table.tHead) return;
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = Math.max(1, table.tHead.rows[0]?.cells.length || 1);
    cell.textContent = 'No records available yet.';
    cell.className = 'table-empty-state';
    cell.setAttribute('role', 'status');
    cell.style.cssText = 'padding:18px;text-align:center;color:var(--muted);';
  });
})();
