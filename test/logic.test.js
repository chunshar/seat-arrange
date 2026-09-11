'use strict';

var assert = require('assert');
var SeatState = require('../js/state.js');

var passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

console.log('logic.test.js');

test('createInitialState は空のテーブル配列を返す', function () {
  var state = SeatState.createInitialState();
  assert.deepStrictEqual(state, { tables: [] });
});

test('addTable でテーブルが追加され、名前・初期椅子数が反映される', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { name: '受付テーブル', seatCount: 4 });
  assert.strictEqual(state.tables.length, 1);
  assert.strictEqual(table.name, '受付テーブル');
  assert.strictEqual(table.seats.length, 4);
});

test('addTable は名前未指定の場合デフォルト名を付与する', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 0 });
  assert.strictEqual(table.name, 'テーブル1');
});

test('addTable はテーブル数が6を超えると追加できない', function () {
  var state = SeatState.createInitialState();
  for (var i = 0; i < 6; i++) {
    assert.ok(SeatState.addTable(state, { seatCount: 0 }));
  }
  var result = SeatState.addTable(state, { seatCount: 0 });
  assert.strictEqual(result, null);
  assert.strictEqual(state.tables.length, 6);
});

test('addTable は椅子数を0〜8にクランプする', function () {
  var state = SeatState.createInitialState();
  var over = SeatState.addTable(state, { seatCount: 100 });
  assert.strictEqual(over.seats.length, 8);
  var under = SeatState.addTable(state, { seatCount: -5 });
  assert.strictEqual(under.seats.length, 0);
});

test('removeTable でテーブルを削除できる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 0 });
  assert.strictEqual(SeatState.removeTable(state, table.id), true);
  assert.strictEqual(state.tables.length, 0);
  assert.strictEqual(SeatState.removeTable(state, table.id), false);
});

test('renameTable でテーブル名を変更できる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 0 });
  assert.strictEqual(SeatState.renameTable(state, table.id, '新しい名前'), true);
  assert.strictEqual(table.name, '新しい名前');
});

test('moveTable で座標を更新できる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 0 });
  assert.strictEqual(SeatState.moveTable(state, table.id, 120, 240), true);
  assert.strictEqual(table.x, 120);
  assert.strictEqual(table.y, 240);
});

test('addSeat / removeSeat で椅子数が増減し、上限8で追加できなくなる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 8 });
  assert.strictEqual(SeatState.addSeat(state, table.id), null);
  assert.strictEqual(table.seats.length, 8);

  var seat = table.seats[0];
  assert.strictEqual(SeatState.removeSeat(state, table.id, seat.id), true);
  assert.strictEqual(table.seats.length, 7);

  var added = SeatState.addSeat(state, table.id);
  assert.ok(added);
  assert.strictEqual(table.seats.length, 8);
});

test('removeSeat は割り当て済みメンバーごと椅子を削除する', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 1 });
  var seat = table.seats[0];
  SeatState.assignMember(state, table.id, seat.id, { name: '田中', xId: '@tanaka' });
  assert.strictEqual(SeatState.removeSeat(state, table.id, seat.id), true);
  assert.strictEqual(table.seats.length, 0);
});

test('assignMember は名前必須で、名前があれば登録できる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 1 });
  var seat = table.seats[0];

  var emptyResult = SeatState.assignMember(state, table.id, seat.id, { name: '   ', xId: '' });
  assert.strictEqual(emptyResult.ok, false);
  assert.strictEqual(seat.member, null);

  var okResult = SeatState.assignMember(state, table.id, seat.id, { name: '山田太郎', xId: '@yamada' });
  assert.strictEqual(okResult.ok, true);
  assert.strictEqual(seat.member.name, '山田太郎');
  assert.strictEqual(seat.member.xId, '@yamada');
});

test('unassignMember で割り当てを解除できる', function () {
  var state = SeatState.createInitialState();
  var table = SeatState.addTable(state, { seatCount: 1 });
  var seat = table.seats[0];
  SeatState.assignMember(state, table.id, seat.id, { name: '佐藤', xId: '' });
  assert.strictEqual(SeatState.unassignMember(state, table.id, seat.id), true);
  assert.strictEqual(seat.member, null);
});

test('resetVenue で全テーブルが削除される', function () {
  var state = SeatState.createInitialState();
  SeatState.addTable(state, { seatCount: 2 });
  SeatState.addTable(state, { seatCount: 3 });
  SeatState.resetVenue(state);
  assert.strictEqual(state.tables.length, 0);
});

console.log(passed + ' 件のテストが成功しました');
