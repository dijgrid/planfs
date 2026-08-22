/**
 * Browser-side behavior for the board webview.
 */

import { HELP_SCRIPT } from './help';
import type { BoardMode, BoardPayload } from './board';

export function renderBoardBrowserScript(payload: BoardPayload, initialMode: BoardMode): string {
  const serializedPayload = JSON.stringify(payload);
  const serializedInitialMode = JSON.stringify(initialMode);
  return `    const vscode = acquireVsCodeApi();
    let state = ${serializedPayload};
    let selectedTaskId = state.tasks[0]?.id || '';
    const selectedBulkTaskIds = new Set();
    const persistedState = typeof vscode.getState === 'function' ? vscode.getState() : {};
    selectedTaskId = String(persistedState?.selectedTaskId || selectedTaskId);
    const minDetailsWidth = 280;
    const maxDetailsWidth = 560;
    let detailsPanelWidth = normalizeDetailsPanelWidth(
      persistedState?.detailsPanelWidth ?? state.preferences?.detailsPanelWidth
    );
    let detailsPanelCompact = typeof persistedState?.detailsPanelCompact === 'boolean'
      ? persistedState.detailsPanelCompact
      : Boolean(state.preferences?.detailsPanelCompact);
    let detailsPanelHidden = Boolean(persistedState?.detailsPanelHidden);
    let boardScope = normalizeBoardScope(persistedState?.boardScope ?? state.preferences?.boardScope);
    let milestoneFocus = String(state.preferences?.milestoneFocus ?? '');
    let resizeStartX = 0;
    let resizeStartWidth = detailsPanelWidth;
    const initialMode = ${serializedInitialMode};
    let boardMode = initialMode === 'next-work'
      ? 'next-work'
      : persistedState?.boardMode === 'next-work' ? 'next-work' : 'status';
    const groupingModes = ['none', 'epic', 'milestone', 'assignee', 'priority'];
    const terminalStatuses = ['done'];
    const terminalPreviewLimit = 5;
    const expandedTerminalColumns = new Set();
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const labels = {
      todo: 'Todo',
      'in-progress': 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    const nextWorkGroups = [
      { id: 'ready', label: 'Ready Now' },
      { id: 'in-progress', label: 'In Progress' },
      { id: 'needs-review', label: 'Needs Review' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'later', label: 'Later' }
    ];

    const filterInput = document.getElementById('filter');
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    const boardScopeInput = document.getElementById('boardScope');
    const savedFilterInput = document.getElementById('savedFilter');
    const milestoneFocusInput = document.getElementById('milestoneFocus');
    const clearMilestoneFocusButton = document.getElementById('clearMilestoneFocus');
    const groupInput = document.getElementById('group');
    const sortInput = document.getElementById('sort');
    const bulkBar = document.getElementById('bulkBar');
    const bulkCount = document.getElementById('bulkCount');
    const bulkActionInput = document.getElementById('bulkAction');
    const bulkApplyButton = document.getElementById('bulkApply');
    const bulkClearButton = document.getElementById('bulkClear');
    const scopeNotice = document.getElementById('scopeNotice');
    const content = document.getElementById('content');
    const board = document.getElementById('board');
    const details = document.getElementById('details');

    groupInput.value = groupingModes.includes(persistedState?.groupKey)
      ? persistedState.groupKey
      : 'none';
    filterInput.value = String(persistedState?.filterQuery || '');
    sortInput.value = ['id', 'title', 'priority', 'assignee'].includes(persistedState?.sortKey)
      ? persistedState.sortKey
      : 'id';
    boardScopeInput.value = boardScope;
    renderSavedFilterOptions();
    renderMilestoneOptions();
    updateModeButtons();

    filterInput.addEventListener('input', () => { persistBoardState(); render(); });
    modeButtons.forEach((button, index) => {
      button.addEventListener('click', () => setBoardMode(button.dataset.mode));
      button.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
          return;
        }

        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + direction + modeButtons.length) % modeButtons.length;
        const nextButton = modeButtons[nextIndex];
        nextButton.focus();
        setBoardMode(nextButton.dataset.mode);
      });
    });
    boardScopeInput.addEventListener('change', () => {
      boardScope = normalizeBoardScope(boardScopeInput.value);
      persistBoardState();
      persistDetailsPanelPreference('board.scope', boardScope);
      render();
    });
    savedFilterInput.addEventListener('change', () => { persistBoardState(); render(); });
    document.getElementById('saveFilter').addEventListener('click', () => {
      const criteria = {};
      if (filterInput.value.trim()) criteria.query = filterInput.value.trim();
      if (milestoneFocus) criteria.milestone = milestoneFocus;
      vscode.postMessage({ type: 'saveCurrentFilter', criteria });
    });
    document.getElementById('manageFilter').addEventListener('click', () => vscode.postMessage({ type: 'manageSavedFilter', id: savedFilterInput.value }));
    milestoneFocusInput.addEventListener('change', () => {
      milestoneFocus = milestoneFocusInput.value;
      persistBoardState();
      persistDetailsPanelPreference('board.milestoneFocus', milestoneFocus);
      render();
    });
    clearMilestoneFocusButton.addEventListener('click', () => {
      milestoneFocus = '';
      milestoneFocusInput.value = '';
      persistBoardState();
      persistDetailsPanelPreference('board.milestoneFocus', '');
      render();
    });
    groupInput.addEventListener('change', () => {
      persistBoardState();
      render();
    });
    sortInput.addEventListener('change', () => { persistBoardState(); render(); });
    bulkApplyButton.addEventListener('click', () => {
      vscode.postMessage({
        type: 'bulkUpdateTasks',
        taskIds: Array.from(selectedBulkTaskIds),
        action: bulkActionInput.value,
        expectedUpdatedAtByTaskId: Object.fromEntries(
          Array.from(selectedBulkTaskIds).map(taskId => [
            taskId,
            state.tasks.find(task => task.id === taskId)?.updatedAt
          ])
        )
      });
    });
    bulkClearButton.addEventListener('click', () => {
      selectedBulkTaskIds.clear();
      render();
    });
    window.addEventListener('message', event => {
      if (event.data?.type !== 'updateBoard') {
        if (event.data?.type === 'selectTask') {
          selectTask(event.data.taskId);
        }
        if (event.data?.type === 'clearSelection') {
          selectedBulkTaskIds.clear();
          render();
        }
        return;
      }

      const selectedFilter = savedFilterInput.value;
      state = event.data.payload;
      const taskIds = new Set(state.tasks.map(task => task.id));
      Array.from(selectedBulkTaskIds).forEach(taskId => {
        if (!taskIds.has(taskId)) {
          selectedBulkTaskIds.delete(taskId);
        }
      });
      if (!state.tasks.some(task => task.id === selectedTaskId)) {
        selectedTaskId = state.tasks[0]?.id || '';
        detailsPanelHidden = false;
      }
      renderSavedFilterOptions(selectedFilter);
      renderMilestoneOptions();
      render({ animate: true });
    });

    function setBoardMode(mode) {
      if (mode !== 'status' && mode !== 'next-work') {
        return;
      }

      boardMode = mode;
      persistBoardState();
      updateModeButtons();
      render();
    }

    function persistBoardState() {
      if (typeof vscode.setState !== 'function') {
        return;
      }

      const currentState = typeof vscode.getState === 'function' ? vscode.getState() : {};
      vscode.setState({
        ...(currentState || {}),
        boardMode,
        selectedTaskId,
        filterQuery: filterInput.value,
        savedFilterId: savedFilterInput.value,
        sortKey: sortInput.value,
        groupKey: groupInput.value,
        boardScope,
        detailsPanelWidth,
        detailsPanelCompact,
        detailsPanelHidden
      });
    }

    function updateModeButtons() {
      modeButtons.forEach(button => {
        const isActive = button.dataset.mode === boardMode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      });
    }

    function renderSavedFilterOptions(selectedFilter = persistedState?.savedFilterId || savedFilterInput.value) {
      const allTasks = document.createElement('option');
      allTasks.value = '';
      allTasks.textContent = 'All tasks';
      const options = state.savedFilters.map(filter => {
        const option = document.createElement('option');
        option.value = filter.id;
        option.textContent = filter.name;
        return option;
      });
      savedFilterInput.replaceChildren(allTasks, ...options);
      savedFilterInput.value = state.savedFilters.some(filter => filter.id === selectedFilter)
        ? selectedFilter
        : '';
    }

    function renderMilestoneOptions() {
      const all = document.createElement('option');
      all.value = '';
      all.textContent = 'All milestones';
      const options = state.milestones.map(milestone => {
        const option = document.createElement('option');
        option.value = milestone.id;
        option.textContent = milestone.id + ' · ' + milestone.title;
        return option;
      });
      if (!state.milestones.some(milestone => milestone.id === milestoneFocus)) milestoneFocus = '';
      milestoneFocusInput.replaceChildren(all, ...options);
      milestoneFocusInput.value = milestoneFocus;
      clearMilestoneFocusButton.hidden = !milestoneFocus;
    }

    function render(options = {}) {
      const previousRects = options.animate ? measureCards() : new Map();
      const filterText = filterInput.value.trim().toLowerCase();
      const savedFilter = state.savedFilters.find(filter => filter.id === savedFilterInput.value);
      const filterContext = savedFilterTaskContext(savedFilter?.criteria);
      const groupKey = groupInput.value;
      const sortKey = sortInput.value;
      const filtered = state.tasks
        .filter(task => matchesBoardScope(task, boardScope))
        .filter(task => matchesSavedFilter(task, savedFilter?.criteria))
        .filter(task => matchesFilter(task, filterText));
      clearMilestoneFocusButton.hidden = !milestoneFocus;
      milestoneFocusInput.title = milestoneFocus
        ? 'Showing only tasks in ' + milestoneFocus + '; board scope, search, and saved filters still apply.'
        : 'Optionally focus the board and Next Work on one active milestone.';
      const focusedMilestone = state.milestones.find(milestone => milestone.id === milestoneFocus);
      scopeNotice.textContent = focusedMilestone
        ? (filtered.length === 0
          ? 'No tasks match ' + focusedMilestone.id + ' and the current scope, search, and saved filters.'
          : 'Milestone focus: ' + focusedMilestone.id + ' · ' + focusedMilestone.title)
        : '';
      if (!filtered.some(task => task.id === selectedTaskId)) {
        selectedTaskId = filtered[0]?.id || '';
      }

      if (boardMode === 'next-work') {
        board.classList.add('nextWork');
        board.classList.remove('swimlanes');
        groupInput.disabled = true;
        sortInput.disabled = true;
        board.replaceChildren(...nextWorkGroups.map(group => renderNextWorkColumn(group, filtered)));
      } else {
        board.classList.remove('nextWork');
        groupInput.disabled = false;
        sortInput.disabled = false;
        const sorted = filtered.sort((a, b) => compareTasks(a, b, sortKey));
        if (groupKey === 'none') {
          board.classList.remove('swimlanes');
          board.replaceChildren(...state.statuses.map(status => renderColumn(
            status,
            sorted,
            filterContext
          )));
        } else {
          board.classList.add('swimlanes');
          board.replaceChildren(...groupTasks(sorted, groupKey).map(group => renderSwimlane(
            group,
            sortKey,
            filterContext
          )));
        }
      }

      if (options.animate) {
        animateMovedCards(previousRects);
      }

      applyDetailsLayout();
      renderDetails();
      renderBulkActions();
    }

    function applyDetailsLayout() {
      const isHidden = detailsPanelHidden || !selectedTaskId;
      content.style.setProperty('--details-width', detailsPanelWidth + 'px');
      content.classList.toggle('detailsHidden', isHidden);
      details.classList.toggle('compact', detailsPanelCompact);
    }

    function normalizeDetailsPanelWidth(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return 340;
      }

      return Math.min(maxDetailsWidth, Math.max(minDetailsWidth, Math.round(parsed)));
    }

    function persistDetailsPanelPreference(key, value) {
      vscode.postMessage({
        type: 'setBoardPreference',
        key,
        value
      });
    }

    function renderBulkActions() {
      const count = selectedBulkTaskIds.size;
      bulkBar.classList.toggle('active', count > 0);
      bulkCount.textContent = count + ' selected';
      bulkApplyButton.disabled = count === 0;
      bulkClearButton.disabled = count === 0;
    }

    function matchesFilter(task, filterText) {
      if (!filterText) {
        return true;
      }

      const searchable = [
        task.id,
        task.title,
        task.priority,
        task.assignee,
        task.epic,
        task.milestone,
        JSON.stringify(task.metadata),
        task.body,
        ...(task.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(filterText);
    }

    function normalizeBoardScope(value) {
      return value === 'all-open' || value === 'backlog' || value === 'saved-filter'
        ? value
        : 'actionable';
    }

    function matchesBoardScope(task, scope) {
      if (scope === 'saved-filter') {
        return true;
      }

      if (scope === 'all-open') {
        return task.status !== 'done';
      }

      if (scope === 'backlog') {
        return task.status !== 'done'
          && ['captured', 'needs-refinement', 'deferred', 'discarded'].includes(task.refinementState);
      }

      return task.status !== 'done'
        && (task.refinementState === 'ready' || task.status === 'in-progress' || task.status === 'review');
    }

    function matchesSavedFilter(task, criteria) {
      if (!criteria) {
        return true;
      }

      if (criteria.query && !matchesFilter(task, String(criteria.query).toLowerCase())) {
        return false;
      }

      if (criteria.status && !matchesValue(task.status, criteria.status)) {
        return false;
      }

      if (criteria.assignee && task.assignee !== criteria.assignee) {
        return false;
      }

      if (criteria.epic && task.epic !== criteria.epic) {
        return false;
      }

      if (criteria.milestone && task.milestone !== criteria.milestone) {
        return false;
      }

      if (criteria.priority && task.priority !== criteria.priority) {
        return false;
      }

      if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
        const tags = new Set(task.tags || []);
        return criteria.tags.every(tag => tags.has(tag));
      }

      return true;
    }

    function compareTasks(a, b, sortKey) {
      if (sortKey === 'priority') {
        return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) || a.id.localeCompare(b.id);
      }

      return String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) || a.id.localeCompare(b.id);
    }

    function matchesValue(value, expected) {
      return Array.isArray(expected) ? expected.includes(value) : value === expected;
    }

    function savedFilterTaskContext(criteria) {
      if (!criteria) {
        return {};
      }

      const context = {};
      if (criteria.assignee) context.assignee = criteria.assignee;
      if (criteria.epic) context.epic = criteria.epic;
      if (criteria.priority) context.priority = criteria.priority;
      if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
        context.tags = criteria.tags;
      }
      return context;
    }

    function groupTasks(tasks, groupKey) {
      const groups = new Map();
      tasks.forEach(task => {
        const value = groupingValue(task, groupKey);
        const existing = groups.get(value.id) || {
          id: value.id,
          label: value.label,
          description: value.description,
          context: value.context,
          tasks: []
        };
        existing.tasks.push(task);
        groups.set(value.id, existing);
      });

      return Array.from(groups.values()).sort((a, b) => compareGroups(a, b, groupKey));
    }

    function groupingValue(task, groupKey) {
      const missing = {
        epic: 'No epic',
        milestone: 'No milestone',
        assignee: 'Unassigned',
        priority: 'No priority'
      };
      const rawValue = task[groupKey];
      const label = rawValue || missing[groupKey] || 'None';
      return {
        id: String(label),
        label: String(label),
        description: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
        context: rawValue ? { [groupKey]: rawValue } : {}
      };
    }

    function compareGroups(a, b, groupKey) {
      if (groupKey === 'priority') {
        return (priorityRank[a.id] ?? 99) - (priorityRank[b.id] ?? 99) || a.label.localeCompare(b.label);
      }

      return a.label.localeCompare(b.label);
    }

    function renderSwimlane(group, sortKey, filterContext) {
      const section = document.createElement('section');
      section.className = 'swimlane';

      const header = document.createElement('div');
      header.className = 'swimlaneHeader';
      header.innerHTML = [
        '<div>',
          '<div class="swimlaneTitle">' + escapeHtml(group.label) + '</div>',
          '<div class="subtle">' + escapeHtml(group.description) + '</div>',
        '</div>',
        '<div class="swimlaneMeta">' + group.tasks.length + ' task' + (group.tasks.length === 1 ? '' : 's') + '</div>'
      ].join('');

      const row = document.createElement('div');
      row.className = 'swimlaneBoard';
      row.append(...state.statuses.map(status => renderColumn(
        status,
        group.tasks.slice().sort((a, b) => compareTasks(a, b, sortKey)),
        { ...filterContext, ...group.context }
      )));

      section.append(header, row);
      return section;
    }

    function renderColumn(status, tasks, context = {}) {
      const columnTasks = tasks.filter(task => task.status === status);
      const terminalColumn = terminalStatuses.includes(status);
      const terminalKey = terminalColumnKey(status, context);
      const terminalExpanded = expandedTerminalColumns.has(terminalKey);
      const visibleTasks = terminalColumn && !terminalExpanded
        ? columnTasks.slice(0, terminalPreviewLimit)
        : columnTasks;
      const hiddenCount = columnTasks.length - visibleTasks.length;
      const column = document.createElement('section');
      column.className = 'column';
      const createContext = { ...context, status };

      const header = document.createElement('div');
      header.className = 'columnHeader';
      header.innerHTML = [
        '<span>' + labels[status] + '</span>',
        '<span class="count">' + columnTasks.length + '</span>',
        '<button type="button" data-create-context="' + escapeHtml(JSON.stringify(createContext)) + '" title="Create task in ' + escapeHtml(labels[status]) + '">+</button>'
      ].join('');

      const createButton = header.querySelector('[data-create-context]');
      if (createButton) {
        createButton.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({
            type: 'createTask',
            context: JSON.parse(createButton.dataset.createContext)
          });
        });
      }

      const dropzone = document.createElement('div');
      dropzone.className = 'dropzone';
      dropzone.dataset.status = status;
      dropzone.addEventListener('dragover', event => {
        event.preventDefault();
        dropzone.classList.add('dragOver');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragOver'));
      dropzone.addEventListener('drop', event => {
        event.preventDefault();
        dropzone.classList.remove('dragOver');
        const taskId = event.dataTransfer.getData('text/plain');
        vscode.postMessage({ type: 'updateTaskStatus', taskId, status });
      });

      if (visibleTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No tasks';
        dropzone.append(empty);
      } else {
        dropzone.append(...visibleTasks.map(task => renderCard(task)));
      }

      if (terminalColumn && columnTasks.length > terminalPreviewLimit) {
        const terminalSummary = document.createElement('div');
        terminalSummary.className = 'terminalSummary';
        const hiddenLabel = terminalExpanded
          ? 'Showing all ' + columnTasks.length + ' completed tasks'
          : hiddenCount + ' completed task' + (hiddenCount === 1 ? '' : 's') + ' hidden';
        terminalSummary.innerHTML = [
          '<span>' + hiddenLabel + '</span>',
          '<button type="button" data-toggle-terminal="' + escapeHtml(terminalKey) + '">' + (terminalExpanded ? 'Show fewer' : 'Show all') + '</button>'
        ].join('');

        const toggleButton = terminalSummary.querySelector('[data-toggle-terminal]');
        if (toggleButton) {
          toggleButton.addEventListener('click', () => {
            if (expandedTerminalColumns.has(terminalKey)) {
              expandedTerminalColumns.delete(terminalKey);
            } else {
              expandedTerminalColumns.add(terminalKey);
            }
            render();
          });
        }
        dropzone.append(terminalSummary);
      }

      column.append(header, dropzone);
      return column;
    }

    function terminalColumnKey(status, context) {
      return status + ':' + JSON.stringify(stableContext(context));
    }

    function stableContext(context) {
      return Object.keys(context)
        .sort()
        .reduce((stable, key) => {
          stable[key] = context[key];
          return stable;
        }, {});
    }

    function renderNextWorkColumn(group, tasks) {
      const columnTasks = tasks
        .filter(task => nextWorkGroupForTask(task) === group.id)
        .sort(compareNextWorkTasks);
      const column = document.createElement('section');
      column.className = 'column';

      const header = document.createElement('div');
      header.className = 'columnHeader';
      header.innerHTML = '<span>' + group.label + '</span><span class="count">' + columnTasks.length + '</span>';

      const dropzone = document.createElement('div');
      dropzone.className = 'dropzone';

      if (columnTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No tasks';
        dropzone.append(empty);
      } else {
        dropzone.append(...columnTasks.map(task => renderCard(task, { showReasons: true })));
      }

      column.append(header, dropzone);
      return column;
    }

    function nextWorkGroupForTask(task) {
      if (task.status === 'done') return null;
      if (task.readiness === 'ready') return 'ready';
      if (task.readiness === 'in-progress') return 'in-progress';
      if (task.readiness === 'needs-review') return 'needs-review';
      if (task.readiness === 'blocked' || task.readiness === 'missing-dependency') return 'blocked';
      return 'later';
    }

    function compareNextWorkTasks(a, b) {
      return (a.nextWorkRank ?? 9999) - (b.nextWorkRank ?? 9999) || compareTasks(a, b, 'priority');
    }

    function renderCard(task, options = {}) {
      const card = document.createElement('article');
      card.className = [
        'card',
        task.status,
        task.id === selectedTaskId ? 'selected' : '',
        selectedBulkTaskIds.has(task.id) ? 'bulkSelected' : ''
      ].filter(Boolean).join(' ');
      card.dataset.taskId = task.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Select ' + task.id + ': ' + task.title);
      card.draggable = true;
      card.addEventListener('click', () => selectTask(task.id));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        selectTask(task.id);
      });
      card.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      });

      const meta = [task.priority, task.assignee].filter(Boolean);
      const reasons = options.showReasons
        ? (task.nextWorkReasons || []).slice(0, 3)
        : [];
      const actions = [
        task.status === 'todo' && task.readiness === 'ready'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="in-progress">Start work</button>'
          : '',
        task.status === 'in-progress'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="review">Mark ready for review</button>'
          : '',
        task.status === 'in-progress' || task.status === 'review'
          ? '<button type="button" data-transition-task="' + escapeHtml(task.id) + '" data-status="done">Mark done</button>'
          : '',
        ...renderRefinementActions(task)
      ].filter(Boolean).join('');
      card.innerHTML = [
        '<label class="bulkSelect"><input type="checkbox" data-bulk-select="' + escapeHtml(task.id) + '"' + (selectedBulkTaskIds.has(task.id) ? ' checked' : '') + '>Select</label>',
        '<div class="cardId">' + escapeHtml(task.id) + '</div>',
        '<div class="cardTitle">' + escapeHtml(task.title) + '</div>',
        '<div class="meta">' +
          meta.map(value => '<span class="badge">' + escapeHtml(value) + '</span>').join('') +
          (task.epic ? '<button type="button" class="badgeButton" data-open-entity="' + escapeHtml(task.epic) + '" title="Open epic details">' + escapeHtml(task.epic) + '</button>' : '') +
          reasons.map(value => '<span class="badge reason">' + escapeHtml(value) + '</span>').join('') +
        '</div>',
        actions ? '<div class="quickActions">' + actions + '</div>' : ''
      ].join('');

      const bulkCheckbox = card.querySelector('[data-bulk-select]');
      if (bulkCheckbox) {
        bulkCheckbox.addEventListener('click', event => event.stopPropagation());
        bulkCheckbox.addEventListener('change', event => {
          event.stopPropagation();
          if (bulkCheckbox.checked) {
            selectedBulkTaskIds.add(task.id);
          } else {
            selectedBulkTaskIds.delete(task.id);
          }
          render();
        });
      }

      card.querySelectorAll('[data-open-entity]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openEntity });
        });
      });

      card.querySelectorAll('[data-transition-task]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({
            type: 'transitionTaskStatus',
            taskId: button.dataset.transitionTask,
            status: button.dataset.status
          });
        });
      });

      card.querySelectorAll('[data-refinement-task]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          vscode.postMessage({
            type: 'updateTaskRefinementState',
            taskId: button.dataset.refinementTask,
            refinementState: button.dataset.refinementState
          });
        });
      });

      return card;
    }

    function renderRefinementActions(task) {
      return [
        task.refinementState !== 'needs-refinement'
          ? refinementButton(task, 'needs-refinement', 'Move to backlog')
          : '',
        task.refinementState !== 'deferred'
          ? refinementButton(task, 'deferred', 'Defer')
          : '',
        task.refinementState !== 'ready'
          ? refinementButton(task, 'ready', 'Mark ready')
          : '',
        task.refinementState !== 'discarded'
          ? refinementButton(task, 'discarded', 'Discard')
          : ''
      ];
    }

    function refinementButton(task, refinementState, label) {
      return '<button type="button" data-refinement-task="' + escapeHtml(task.id) + '" data-refinement-state="' + escapeHtml(refinementState) + '">' + escapeHtml(label) + '</button>';
    }

    function selectTask(taskId) {
      selectedTaskId = taskId;
      detailsPanelHidden = false;
      persistBoardState();
      render();
    }

    function renderDetails() {
      const task = state.tasks.find(candidate => candidate.id === selectedTaskId);
      if (!task) {
        details.innerHTML = [
          '<div class="detailsHeader"><div><h2>Task Details</h2><div class="subtle">Select a task card to inspect it.</div></div></div>',
          '<div class="detailsBody"><div class="empty">No task selected</div></div>'
        ].join('');
        return;
      }

      details.innerHTML = [
        '<div class="detailsResizeHandle" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize details panel" title="Resize details panel"></div>',
        '<div class="detailsHeader">',
          '<div>',
            '<h2>' + escapeHtml(task.title) + '</h2>',
            '<div class="subtle">' + escapeHtml(task.id) + '</div>',
          '</div>',
          '<div class="detailsHeaderActions">',
            '<button type="button" class="iconButton ' + (detailsPanelCompact ? 'active' : '') + '" data-toggle-details-compact aria-pressed="' + String(detailsPanelCompact) + '" aria-label="Toggle compact details" title="Toggle compact details">-</button>',
            '<button type="button" class="iconButton" data-close-details aria-label="Close details panel" title="Close details panel">x</button>',
          '</div>',
        '</div>',
        '<div class="detailsBody">',
          '<div class="detailActions">',
            '<button type="button" data-open-selected="' + escapeHtml(task.id) + '">Open editor</button>',
            '<button type="button" data-open-file="' + escapeHtml(task.id) + '">Open Markdown</button>',
            '<button type="button" data-copy-selected="' + escapeHtml(task.id) + '">Copy ID</button>',
            task.epic ? '<button type="button" data-open-selected="' + escapeHtml(task.epic) + '">Open epic</button>' : '',
            ...renderRefinementActions(task),
          '</div>',
          renderDetailGrid(task),
          renderDetailSection('Next Work', task.nextWorkReasons || []),
          renderDetailSection('Dependencies', task.dependsOn || []),
          renderDetailSection('Dependents', task.dependents || []),
          renderLinkSection(task.links || {}),
        '</div>'
      ].join('');

      attachDetailsChromeHandlers();

      details.querySelectorAll('[data-open-selected]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'openEntity', entityId: button.dataset.openSelected });
        });
      });

      details.querySelectorAll('[data-open-file]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'openTaskFile', taskId: button.dataset.openFile });
        });
      });

      details.querySelectorAll('[data-copy-selected]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({ type: 'copyTaskId', taskId: button.dataset.copySelected });
        });
      });

      details.querySelectorAll('[data-refinement-task]').forEach(button => {
        button.addEventListener('click', () => {
          vscode.postMessage({
            type: 'updateTaskRefinementState',
            taskId: button.dataset.refinementTask,
            refinementState: button.dataset.refinementState
          });
        });
      });
    }

    function attachDetailsChromeHandlers() {
      const closeButton = details.querySelector('[data-close-details]');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          selectedTaskId = '';
          detailsPanelHidden = true;
          persistBoardState();
          render();
        });
      }

      const compactButton = details.querySelector('[data-toggle-details-compact]');
      if (compactButton) {
        compactButton.addEventListener('click', () => {
          detailsPanelCompact = !detailsPanelCompact;
          persistBoardState();
          persistDetailsPanelPreference('board.details.compact', detailsPanelCompact);
          render();
        });
      }

      const resizeHandle = details.querySelector('.detailsResizeHandle');
      if (!resizeHandle) {
        return;
      }

      resizeHandle.addEventListener('pointerdown', event => {
        event.preventDefault();
        resizeStartX = event.clientX;
        resizeStartWidth = detailsPanelWidth;
        resizeHandle.setPointerCapture(event.pointerId);
      });

      resizeHandle.addEventListener('pointermove', event => {
        if (!resizeHandle.hasPointerCapture(event.pointerId)) {
          return;
        }

        detailsPanelWidth = normalizeDetailsPanelWidth(resizeStartWidth - (event.clientX - resizeStartX));
        applyDetailsLayout();
      });

      resizeHandle.addEventListener('pointerup', event => {
        if (resizeHandle.hasPointerCapture(event.pointerId)) {
          resizeHandle.releasePointerCapture(event.pointerId);
        }

        detailsPanelWidth = normalizeDetailsPanelWidth(detailsPanelWidth);
        persistBoardState();
        persistDetailsPanelPreference('board.details.width', detailsPanelWidth);
      });

      resizeHandle.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
          return;
        }

        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? 1 : -1;
        detailsPanelWidth = normalizeDetailsPanelWidth(detailsPanelWidth + direction * 20);
        applyDetailsLayout();
        persistBoardState();
        persistDetailsPanelPreference('board.details.width', detailsPanelWidth);
      });
    }

    function renderDetailGrid(task) {
      const rows = [
        ['Status', task.status],
        ['Readiness', task.readiness],
        ['Refinement', task.refinementState],
        ['Priority', task.priority],
        ['Assignee', task.assignee],
        ['Epic', task.epic],
        ['Milestone', task.milestone],
        ['Tags', (task.tags || []).join(', ')],
        ['Due date', task.dueDate],
        ['Estimate', task.estimate],
        ['Critical', task.critical ? 'yes' : 'no'],
        ['Unblocks', task.downstreamCount ? String(task.downstreamCount) : '0']
      ].filter(row => row[1]);

      return '<div class="detailGrid">' + rows.map(row =>
        '<div class="detailLabel">' + escapeHtml(row[0]) + '</div><div class="detailValue">' + escapeHtml(row[1]) + '</div>'
      ).join('') + '</div>';
    }

    function renderDetailSection(title, values) {
      const content = values.length > 0
        ? '<div class="meta">' + values.map(value => '<span class="badge">' + escapeHtml(value) + '</span>').join('') + '</div>'
        : '<div class="subtle">None</div>';
      return '<section class="detailSection"><h3>' + escapeHtml(title) + '</h3>' + content + '</section>';
    }

    function renderLinkSection(links) {
      const entries = Object.entries(links);
      if (entries.length === 0) {
        return '<section class="detailSection"><h3>Links</h3><div class="subtle">None</div></section>';
      }

      return '<section class="detailSection"><h3>Links</h3><div class="detailGrid">' + entries.map(entry =>
        '<div class="detailLabel">' + escapeHtml(entry[0]) + '</div><div class="detailValue">' + escapeHtml(entry[1]) + '</div>'
      ).join('') + '</div></section>';
    }

    function measureCards() {
      return new Map(
        Array.from(board.querySelectorAll('.card[data-task-id]')).map(card => [
          card.dataset.taskId,
          card.getBoundingClientRect()
        ])
      );
    }

    function animateMovedCards(previousRects) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      requestAnimationFrame(() => {
        board.querySelectorAll('.card[data-task-id]').forEach(card => {
          const previousRect = previousRects.get(card.dataset.taskId);
          if (!previousRect) {
            return;
          }

          const nextRect = card.getBoundingClientRect();
          const deltaX = previousRect.left - nextRect.left;
          const deltaY = previousRect.top - nextRect.top;

          if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
            return;
          }

          card.animate(
            [
              { transform: 'translate(' + deltaX + 'px, ' + deltaY + 'px)' },
              { transform: 'translate(0, 0)' }
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }
          );
        });
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    render();
    ${HELP_SCRIPT}
`;
}
