/**
 * 座席表アプリのコアロジック（状態モデル・状態操作関数）。
 * ブラウザでは <script src="js/state.js"></script> として読み込むと
 * window.SeatState として公開され、Node.js では require() で利用できる
 * (テストコードから直接ロジックを検証するため)。
 */
(function (root) {
  'use strict';

  var MAX_TABLES = 6;
  var MAX_SEATS = 8;
  var STORAGE_KEY = 'seatArrangeState';

  // 新規テーブルが重ならないよう、追加順にあらかじめ分散させた初期配置(2行3列)。
  var DEFAULT_POSITIONS = [
    { x: 40, y: 40 }, { x: 320, y: 40 }, { x: 600, y: 40 },
    { x: 40, y: 320 }, { x: 320, y: 320 }, { x: 600, y: 320 }
  ];

  function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function createInitialState() {
    return { tables: [] };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function findTable(state, tableId) {
    return state.tables.find(function (t) { return t.id === tableId; }) || null;
  }

  function findSeat(table, seatId) {
    return table.seats.find(function (s) { return s.id === seatId; }) || null;
  }

  function createSeat() {
    return { id: createId(), member: null };
  }

  function createTable(opts, defaultPos) {
    opts = opts || {};
    var seatCount = clamp(Number(opts.seatCount) || 0, 0, MAX_SEATS);
    var seats = [];
    for (var i = 0; i < seatCount; i++) {
      seats.push(createSeat());
    }
    return {
      id: createId(),
      name: (opts.name && String(opts.name).trim()) || '',
      x: typeof opts.x === 'number' ? opts.x : defaultPos.x,
      y: typeof opts.y === 'number' ? opts.y : defaultPos.y,
      seats: seats
    };
  }

  /**
   * テーブルを追加する。既に上限(6)に達している場合は null を返し、何もしない。
   */
  function addTable(state, opts) {
    if (state.tables.length >= MAX_TABLES) {
      return null;
    }
    var defaultPos = DEFAULT_POSITIONS[state.tables.length] || DEFAULT_POSITIONS[0];
    var table = createTable(opts, defaultPos);
    if (!table.name) {
      table.name = 'テーブル' + (state.tables.length + 1);
    }
    state.tables.push(table);
    return table;
  }

  /**
   * テーブルを削除する。削除できた場合 true を返す。
   */
  function removeTable(state, tableId) {
    var index = state.tables.findIndex(function (t) { return t.id === tableId; });
    if (index === -1) {
      return false;
    }
    state.tables.splice(index, 1);
    return true;
  }

  function renameTable(state, tableId, name) {
    var table = findTable(state, tableId);
    if (!table) {
      return false;
    }
    table.name = String(name || '').trim() || table.name;
    return true;
  }

  function moveTable(state, tableId, x, y) {
    var table = findTable(state, tableId);
    if (!table) {
      return false;
    }
    table.x = x;
    table.y = y;
    return true;
  }

  /**
   * テーブルに椅子を1個追加する。上限(8)に達している場合は null を返す。
   */
  function addSeat(state, tableId) {
    var table = findTable(state, tableId);
    if (!table || table.seats.length >= MAX_SEATS) {
      return null;
    }
    var seat = createSeat();
    table.seats.push(seat);
    return seat;
  }

  /**
   * テーブルから椅子を1個削除する（割り当て済みメンバーも削除される）。
   */
  function removeSeat(state, tableId, seatId) {
    var table = findTable(state, tableId);
    if (!table) {
      return false;
    }
    var index = table.seats.findIndex(function (s) { return s.id === seatId; });
    if (index === -1) {
      return false;
    }
    table.seats.splice(index, 1);
    return true;
  }

  /**
   * 椅子にメンバーを割り当てる。名前が空の場合はエラーを返す。
   */
  function assignMember(state, tableId, seatId, member) {
    var table = findTable(state, tableId);
    if (!table) {
      return { ok: false, error: 'テーブルが見つかりません。' };
    }
    var seat = findSeat(table, seatId);
    if (!seat) {
      return { ok: false, error: '椅子が見つかりません。' };
    }
    var name = String((member && member.name) || '').trim();
    if (!name) {
      return { ok: false, error: '名前を入力してください。' };
    }
    var xId = String((member && member.xId) || '').trim();
    seat.member = { name: name, xId: xId };
    return { ok: true };
  }

  /**
   * 椅子の割り当てを解除する。
   */
  function unassignMember(state, tableId, seatId) {
    var table = findTable(state, tableId);
    if (!table) {
      return false;
    }
    var seat = findSeat(table, seatId);
    if (!seat) {
      return false;
    }
    seat.member = null;
    return true;
  }

  function resetVenue(state) {
    state.tables = [];
  }

  function loadState() {
    if (typeof localStorage === 'undefined') {
      return createInitialState();
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createInitialState();
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tables)) {
        return createInitialState();
      }
      return parsed;
    } catch (e) {
      return createInitialState();
    }
  }

  function saveState(state) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage が使用できない環境では永続化をあきらめる */
    }
  }

  var api = {
    MAX_TABLES: MAX_TABLES,
    MAX_SEATS: MAX_SEATS,
    createId: createId,
    createInitialState: createInitialState,
    findTable: findTable,
    findSeat: findSeat,
    addTable: addTable,
    removeTable: removeTable,
    renameTable: renameTable,
    moveTable: moveTable,
    addSeat: addSeat,
    removeSeat: removeSeat,
    assignMember: assignMember,
    unassignMember: unassignMember,
    resetVenue: resetVenue,
    loadState: loadState,
    saveState: saveState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SeatState = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
