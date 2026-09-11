(function () {
  'use strict';

  var state = SeatState.loadState();

  var venueEl = document.getElementById('venue');
  var tableCounterEl = document.getElementById('tableCounter');
  var addTableBtn = document.getElementById('addTableBtn');
  var resetVenueBtn = document.getElementById('resetVenueBtn');

  var tableModalOverlay = document.getElementById('tableModalOverlay');
  var tableForm = document.getElementById('tableForm');
  var tableNameInput = document.getElementById('tableNameInput');
  var tableSeatCountInput = document.getElementById('tableSeatCountInput');
  var tableFormError = document.getElementById('tableFormError');
  var tableModalCancelBtn = document.getElementById('tableModalCancelBtn');

  var memberModalOverlay = document.getElementById('memberModalOverlay');
  var memberModalTitle = document.getElementById('memberModalTitle');
  var memberForm = document.getElementById('memberForm');
  var memberNameInput = document.getElementById('memberNameInput');
  var memberXIdInput = document.getElementById('memberXIdInput');
  var memberFormError = document.getElementById('memberFormError');
  var memberUnassignBtn = document.getElementById('memberUnassignBtn');
  var memberModalCancelBtn = document.getElementById('memberModalCancelBtn');

  var currentMemberContext = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function persistAndRender() {
    SeatState.saveState(state);
    render();
  }

  function getSizes() {
    var cs = getComputedStyle(document.documentElement);
    var table = parseFloat(cs.getPropertyValue('--table-size')) || 120;
    var seat = parseFloat(cs.getPropertyValue('--seat-size')) || 44;
    var gap = 10;
    var orbitRadius = table / 2 + gap + seat / 2;
    var stage = table + 2 * (seat + gap);
    return { table: table, seat: seat, gap: gap, orbitRadius: orbitRadius, stage: stage };
  }

  function seatPosition(index, total, sizes) {
    var angle = total > 0 ? (2 * Math.PI / total) * index - Math.PI / 2 : 0;
    var center = sizes.stage / 2;
    return {
      x: center + sizes.orbitRadius * Math.cos(angle) - sizes.seat / 2,
      y: center + sizes.orbitRadius * Math.sin(angle) - sizes.seat / 2
    };
  }

  function makeIconButton(label, action, title) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-icon';
    btn.textContent = label;
    btn.dataset.action = action;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    return btn;
  }

  function buildTableElement(table, sizes) {
    var wrapper = document.createElement('div');
    wrapper.className = 'table';
    wrapper.dataset.tableId = table.id;
    wrapper.style.left = table.x + 'px';
    wrapper.style.top = table.y + 'px';

    var toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    var renameBtn = makeIconButton('✎', 'rename', 'テーブル名を変更');
    var minusBtn = makeIconButton('−', 'remove-seat', '椅子を減らす');
    minusBtn.disabled = table.seats.length <= 0;
    var countSpan = document.createElement('span');
    countSpan.textContent = table.seats.length + '/' + SeatState.MAX_SEATS;
    var plusBtn = makeIconButton('＋', 'add-seat', '椅子を増やす');
    plusBtn.disabled = table.seats.length >= SeatState.MAX_SEATS;
    var deleteBtn = makeIconButton('✕', 'delete-table', 'テーブルを削除');

    toolbar.appendChild(renameBtn);
    toolbar.appendChild(minusBtn);
    toolbar.appendChild(countSpan);
    toolbar.appendChild(plusBtn);
    toolbar.appendChild(deleteBtn);

    var stage = document.createElement('div');
    stage.className = 'table-stage';
    stage.style.width = sizes.stage + 'px';
    stage.style.height = sizes.stage + 'px';

    var circle = document.createElement('div');
    circle.className = 'table-circle';
    circle.style.width = sizes.table + 'px';
    circle.style.height = sizes.table + 'px';
    circle.style.left = (sizes.stage - sizes.table) / 2 + 'px';
    circle.style.top = (sizes.stage - sizes.table) / 2 + 'px';
    circle.innerHTML = '<div class="table-name">' + escapeHtml(table.name) + '</div>' +
      '<div class="table-seat-count">椅子 ' + table.seats.length + '/' + SeatState.MAX_SEATS + '</div>';

    stage.appendChild(circle);

    table.seats.forEach(function (seat, index) {
      var pos = seatPosition(index, table.seats.length, sizes);
      var seatEl = document.createElement('div');
      seatEl.className = 'seat' + (seat.member ? ' filled' : '');
      seatEl.dataset.seatId = seat.id;
      seatEl.style.left = pos.x + 'px';
      seatEl.style.top = pos.y + 'px';
      if (seat.member) {
        var xIdHtml = '';
        if (seat.member.xId) {
          xIdHtml = '<span class="seat-x-id">@' + escapeHtml(seat.member.xId.replace(/^@/, '')) + '</span>';
        }
        seatEl.innerHTML = escapeHtml(seat.member.name) + xIdHtml;
        seatEl.title = seat.member.name + (seat.member.xId ? ' (@' + seat.member.xId.replace(/^@/, '') + ')' : '');
      } else {
        seatEl.textContent = '＋';
        seatEl.title = 'メンバーを登録';
      }
      stage.appendChild(seatEl);
    });

    wrapper.appendChild(toolbar);
    wrapper.appendChild(stage);
    return wrapper;
  }

  function render() {
    tableCounterEl.textContent = 'テーブル: ' + state.tables.length + '/' + SeatState.MAX_TABLES;
    addTableBtn.disabled = state.tables.length >= SeatState.MAX_TABLES;

    venueEl.innerHTML = '';

    if (state.tables.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'venue-empty';
      empty.id = 'venueEmpty';
      empty.textContent = 'まだテーブルがありません。「＋ テーブルを追加」から作成してください。';
      venueEl.appendChild(empty);
      return;
    }

    var sizes = getSizes();
    state.tables.forEach(function (table) {
      venueEl.appendChild(buildTableElement(table, sizes));
    });
  }

  // ---- テーブル追加モーダル ----
  function openTableModal() {
    tableNameInput.value = '';
    tableSeatCountInput.value = '4';
    tableFormError.hidden = true;
    tableModalOverlay.hidden = false;
    tableNameInput.focus();
  }

  function closeTableModal() {
    tableModalOverlay.hidden = true;
  }

  addTableBtn.addEventListener('click', openTableModal);
  tableModalCancelBtn.addEventListener('click', closeTableModal);
  tableModalOverlay.addEventListener('click', function (e) {
    if (e.target === tableModalOverlay) closeTableModal();
  });

  tableForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var seatCount = Number(tableSeatCountInput.value);
    if (!Number.isFinite(seatCount) || seatCount < 0 || seatCount > SeatState.MAX_SEATS || !Number.isInteger(seatCount)) {
      tableFormError.textContent = '椅子の数は0〜' + SeatState.MAX_SEATS + 'の整数で入力してください。';
      tableFormError.hidden = false;
      return;
    }
    var table = SeatState.addTable(state, { name: tableNameInput.value, seatCount: seatCount });
    if (!table) {
      tableFormError.textContent = 'テーブルは最大' + SeatState.MAX_TABLES + '個までです。';
      tableFormError.hidden = false;
      return;
    }
    persistAndRender();
    closeTableModal();
  });

  // ---- メンバー登録/編集モーダル ----
  function openMemberModal(tableId, seatId) {
    var table = SeatState.findTable(state, tableId);
    if (!table) return;
    var seat = SeatState.findSeat(table, seatId);
    if (!seat) return;

    currentMemberContext = { tableId: tableId, seatId: seatId };
    memberFormError.hidden = true;

    if (seat.member) {
      memberModalTitle.textContent = 'メンバーを編集';
      memberNameInput.value = seat.member.name;
      memberXIdInput.value = seat.member.xId || '';
      memberUnassignBtn.hidden = false;
    } else {
      memberModalTitle.textContent = 'メンバーを登録';
      memberNameInput.value = '';
      memberXIdInput.value = '';
      memberUnassignBtn.hidden = true;
    }

    memberModalOverlay.hidden = false;
    memberNameInput.focus();
  }

  function closeMemberModal() {
    memberModalOverlay.hidden = true;
    currentMemberContext = null;
  }

  memberModalCancelBtn.addEventListener('click', closeMemberModal);
  memberModalOverlay.addEventListener('click', function (e) {
    if (e.target === memberModalOverlay) closeMemberModal();
  });

  memberForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentMemberContext) return;
    var result = SeatState.assignMember(
      state,
      currentMemberContext.tableId,
      currentMemberContext.seatId,
      { name: memberNameInput.value, xId: memberXIdInput.value }
    );
    if (!result.ok) {
      memberFormError.textContent = result.error;
      memberFormError.hidden = false;
      return;
    }
    persistAndRender();
    closeMemberModal();
  });

  memberUnassignBtn.addEventListener('click', function () {
    if (!currentMemberContext) return;
    SeatState.unassignMember(state, currentMemberContext.tableId, currentMemberContext.seatId);
    persistAndRender();
    closeMemberModal();
  });

  // ---- 会場リセット ----
  resetVenueBtn.addEventListener('click', function () {
    if (state.tables.length === 0) return;
    if (window.confirm('会場をリセットしますか？すべてのテーブル・椅子・メンバー情報が削除されます。')) {
      SeatState.resetVenue(state);
      persistAndRender();
    }
  });

  // ---- 会場内のクリック（テーブル操作・椅子クリック）----
  venueEl.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      var wrapper = actionEl.closest('.table');
      if (!wrapper) return;
      var tableId = wrapper.dataset.tableId;
      var table = SeatState.findTable(state, tableId);
      if (!table) return;
      var action = actionEl.dataset.action;

      if (action === 'rename') {
        var name = window.prompt('テーブル名を入力してください', table.name);
        if (name !== null) {
          SeatState.renameTable(state, tableId, name);
          persistAndRender();
        }
      } else if (action === 'add-seat') {
        SeatState.addSeat(state, tableId);
        persistAndRender();
      } else if (action === 'remove-seat') {
        if (table.seats.length > 0) {
          var lastSeat = table.seats[table.seats.length - 1];
          SeatState.removeSeat(state, tableId, lastSeat.id);
          persistAndRender();
        }
      } else if (action === 'delete-table') {
        if (window.confirm('「' + table.name + '」を削除しますか？割り当てられたメンバー情報も削除されます。')) {
          SeatState.removeTable(state, tableId);
          persistAndRender();
        }
      }
      return;
    }

    var seatEl = e.target.closest('.seat');
    if (seatEl) {
      var seatWrapper = seatEl.closest('.table');
      if (!seatWrapper) return;
      openMemberModal(seatWrapper.dataset.tableId, seatEl.dataset.seatId);
    }
  });

  // ---- テーブルのドラッグ移動（マウス・タッチ共通: Pointer Events）----
  venueEl.addEventListener('pointerdown', function (e) {
    var circle = e.target.closest('.table-circle');
    if (!circle) return;
    var wrapper = circle.closest('.table');
    if (!wrapper) return;
    var tableId = wrapper.dataset.tableId;
    var table = SeatState.findTable(state, tableId);
    if (!table) return;

    e.preventDefault();
    wrapper.classList.add('dragging');

    var startClientX = e.clientX;
    var startClientY = e.clientY;
    var startX = table.x;
    var startY = table.y;
    var maxX = Math.max(0, venueEl.clientWidth - wrapper.offsetWidth);
    var maxY = Math.max(0, venueEl.clientHeight - wrapper.offsetHeight);
    var pendingX = startX;
    var pendingY = startY;

    function onMove(ev) {
      var dx = ev.clientX - startClientX;
      var dy = ev.clientY - startClientY;
      pendingX = clamp(startX + dx, 0, maxX);
      pendingY = clamp(startY + dy, 0, maxY);
      wrapper.style.left = pendingX + 'px';
      wrapper.style.top = pendingY + 'px';
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      wrapper.classList.remove('dragging');
      SeatState.moveTable(state, tableId, pendingX, pendingY);
      SeatState.saveState(state);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });

  render();
})();
