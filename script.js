

(function(){
  // ---- find form elements from your original HTML (no IDs required) ----
  const inputCard = document.querySelector('.input-card');
  if (!inputCard) {
    console.warn('No .input-card found. Script stopped.');
    return;
  }

  const taskNameInput = inputCard.querySelector('input[type="text"], input[placeholder="Task name"]');
  const selects = inputCard.querySelectorAll('select');
  const prioritySelect = selects[0] || null;
  const categorySelect = selects[1] || selects[0] || null; // fallback if only one select exists
  const dateInput = inputCard.querySelector('input[type="date"]');
  const numberInputs = inputCard.querySelectorAll('input[type="number"]');
  const hoursInput = numberInputs[0] || null;
  const minutesInput = numberInputs[1] || (numberInputs[0] || null);
  const addBtn = inputCard.querySelector('.add-btn');

  const taskList = document.querySelector('.task-list');
  if (!taskList) {
    console.warn('No .task-list container found. Script stopped.');
    return;
  }

  let editTask = null; // currently editing card

  // ---- helpers ----
  function priorityTextToClass(text) {
    if (!text) return 'low';
    const t = text.toString().toLowerCase();
    if (t.includes('high') || t.includes('🔥')) return 'high';
    if (t.includes('medium') || t.includes('⚡')) return 'medium';
    return 'low';
  }

  function setPrioritySelectByClass(cls) {
    if (!prioritySelect) return;
    for (let i=0;i<prioritySelect.options.length;i++){
      const opt = prioritySelect.options[i];
      if (priorityTextToClass(opt.textContent || opt.value) === cls) {
        prioritySelect.selectedIndex = i;
        return;
      }
    }
    // fallback: first option
    prioritySelect.selectedIndex = 0;
  }

  function setCategorySelectByText(text) {
    if (!categorySelect) return;
    for (let i=0;i<categorySelect.options.length;i++){
      const opt = categorySelect.options[i];
      if ((opt.textContent || opt.value).trim().toLowerCase() === (text||'').trim().toLowerCase()) {
        categorySelect.selectedIndex = i;
        return;
      }
    }
    // no exact match: try partial match
    for (let i=0;i<categorySelect.options.length;i++){
      const opt = categorySelect.options[i];
      if ((opt.textContent || opt.value).toLowerCase().includes((text||'').toLowerCase())) {
        categorySelect.selectedIndex = i;
        return;
      }
    }
  }

  function parseTimeString(timeStr) {
    // handle strings like "2h", "45m", "2h 30m", "2h 0m", "2h 0"
    const res = { hours: '0', minutes: '0' };
    if (!timeStr) return res;
    const h = /(\d+)\s*h/.exec(timeStr);
    const m = /(\d+)\s*m/.exec(timeStr);
    if (h) res.hours = String(parseInt(h[1],10));
    if (m) res.minutes = String(parseInt(m[1],10));
    // fallback if "2h" only -> minutes 0
    return res;
  }

  function buildTimeText(hrs, mins) {
    hrs = (hrs === undefined || hrs === null || hrs === '') ? '0' : String(Math.max(0, parseInt(hrs,10) || 0));
    mins = (mins === undefined || mins === null || mins === '') ? '0' : String(Math.max(0, Math.min(59, parseInt(mins,10) || 0)));
    // if minutes is 0 show "Xh" for compactness, else "Xh Ym"
    if (parseInt(mins,10) === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  }

  function createActionButtons() {
    const wrap = document.createElement('div');
    wrap.className = 'task-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-btn';
    edit.textContent = 'Edit';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-btn';
    del.textContent = 'Delete';
    wrap.appendChild(edit);
    wrap.appendChild(del);
    return { wrap, edit, del };
  }

  function attachHandlersToCard(card) {
    // ensure actions exist
    let actions = card.querySelector('.task-actions');
    let editBtn, deleteBtn;
    if (!actions) {
      const buttons = createActionButtons();
      card.appendChild(buttons.wrap);
      editBtn = buttons.edit;
      deleteBtn = buttons.del;
    } else {
      editBtn = card.querySelector('.edit-btn');
      deleteBtn = card.querySelector('.delete-btn');
      if (!editBtn || !deleteBtn) {
        const buttons = createActionButtons();
        card.appendChild(buttons.wrap);
        editBtn = buttons.edit;
        deleteBtn = buttons.del;
      }
    }

    // remove old listeners by cloning (safe approach)
    editBtn.replaceWith(editBtn.cloneNode(true));
    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    editBtn = card.querySelector('.edit-btn');
    deleteBtn = card.querySelector('.delete-btn');

    editBtn.addEventListener('click', () => {
      editTask = card;
      // populate form
      const h4 = card.querySelector('h4');
      const p = card.querySelector('p');

      taskNameInput && (taskNameInput.value = h4 ? h4.innerText.trim() : '');
      // priority from class names or data-priority
      let pcls = 'low';
      if (card.classList.contains('high')) pcls = 'high';
      else if (card.classList.contains('medium')) pcls = 'medium';
      else if (card.classList.contains('low')) pcls = 'low';
      // If data attribute exists, prefer it
      if (card.dataset && card.dataset.priority) pcls = priorityTextToClass(card.dataset.priority);

      setPrioritySelectByClass(pcls);

      // category: try data- attribute then parse p text before '•'
      let cat = card.dataset && card.dataset.category ? card.dataset.category : '';
      if (!cat && p) {
        const parts = p.textContent.split('•');
        cat = (parts[0] || '').trim();
      }
      setCategorySelectByText(cat);

      // parse time
      let hrs = card.dataset && card.dataset.hours ? card.dataset.hours : '';
      let mins = card.dataset && card.dataset.minutes ? card.dataset.minutes : '';
      if (!hrs && !mins && p) {
        // attempt to parse right side after '•'
        const parts = p.textContent.split('•');
        const right = (parts[1] || '').trim();
        const tm = parseTimeString(right);
        hrs = tm.hours; mins = tm.minutes;
      }
      if (hoursInput) hoursInput.value = hrs;
      if (minutesInput) minutesInput.value = mins;

      // due date if present in data
      if (dateInput) dateInput.value = card.dataset && card.dataset.due ? card.dataset.due : '';

      if (addBtn) addBtn.innerText = 'Update Task';
      // scroll into view for convenience
      taskNameInput && taskNameInput.focus();
    });

    deleteBtn.addEventListener('click', () => {
      if (editTask === card) resetForm();
      card.remove();
    });
  }

  function resetForm() {
    if (taskNameInput) taskNameInput.value = '';
    if (hoursInput) hoursInput.value = '';
    if (minutesInput) minutesInput.value = '';
    if (dateInput) dateInput.value = '';
    if (prioritySelect) prioritySelect.selectedIndex = 0;
    if (categorySelect) categorySelect.selectedIndex = 0;
    editTask = null;
    if (addBtn) addBtn.innerText = (addBtn.dataset && addBtn.dataset.originalText) ? addBtn.dataset.originalText : 'Add Task';
  }

  // initialize: attach handlers to existing cards (if any)
  Array.from(taskList.querySelectorAll('.task-card')).forEach(attachHandlersToCard);

  // preserve original add button text
  if (addBtn && !addBtn.dataset.originalText) addBtn.dataset.originalText = addBtn.innerText || 'Add Task';

  // main add/update handler
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = taskNameInput ? taskNameInput.value.trim() : '';
      if (!name) {
        alert('Please enter a task name');
        return;
      }

      // determine priority class from select text (works even if select has no value)
      const prText = prioritySelect ? (prioritySelect.value || prioritySelect.options[prioritySelect.selectedIndex].text) : 'low';
      const prClass = priorityTextToClass(prText);

      const catText = categorySelect ? (categorySelect.value || categorySelect.options[categorySelect.selectedIndex].text) : '';
      const hrs = hoursInput ? (hoursInput.value === '' ? '0' : String(Math.max(0, parseInt(hoursInput.value,10) || 0))) : '0';
      let mins = minutesInput ? (minutesInput.value === '' ? '0' : String(Math.max(0, parseInt(minutesInput.value,10) || 0))) : '0';
      if (parseInt(mins,10) > 59) mins = '59';
      const due = dateInput ? dateInput.value : '';

      const timeText = buildTimeText(hrs, mins);

      if (editTask) {
        // update existing
        const h4 = editTask.querySelector('h4') || document.createElement('h4');
        const p = editTask.querySelector('p') || document.createElement('p');

        if (!h4.parentElement) editTask.appendChild(h4);
        if (!p.parentElement) editTask.appendChild(p);

        h4.innerText = name;
        p.innerText = `${catText} • ${timeText}`;

        // update dataset for future edits
        editTask.dataset.title = name;
        editTask.dataset.category = catText;
        editTask.dataset.hours = hrs;
        editTask.dataset.minutes = mins;
        if (due) editTask.dataset.due = due; else delete editTask.dataset.due;

        // update priority class
        editTask.classList.remove('high','medium','low');
        editTask.classList.add(prClass);

        resetForm();
        return;
      }

      // create new card
      const card = document.createElement('div');
      card.className = `task-card ${prClass}`;
      // store useful data attributes so edit works well
      card.dataset.title = name;
      card.dataset.priority = prText;
      card.dataset.category = catText;
      card.dataset.hours = hrs;
      card.dataset.minutes = mins;
      if (due) card.dataset.due = due;

      const h4 = document.createElement('h4');
      h4.innerText = name;

      const p = document.createElement('p');
      p.innerText = `${catText} • ${timeText}`;

      card.appendChild(h4);
      card.appendChild(p);

      // actions
      const { wrap, edit, del } = (function(){
        const { wrap, edit, del } = createActionButtons();
        return { wrap, edit, del };
      })();
      card.appendChild(wrap);

      taskList.appendChild(card);
      attachHandlersToCard(card);
      resetForm();
    });
  } else {
    console.warn('Add button not found in .input-card');
  }

  // utility: createActionButtons used inside attach when needed
  function createActionButtons() {
    const wrap = document.createElement('div');
    wrap.className = 'task-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-btn';
    edit.textContent = 'Edit';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-btn';
    del.textContent = 'Delete';
    wrap.appendChild(edit);
    wrap.appendChild(del);
    return { wrap, edit, del };
  }

  // END self-invoking
})();
