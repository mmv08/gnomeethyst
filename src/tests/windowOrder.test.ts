import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextIdInOrder,
  reconcileWindowOrder,
  swapInOrder,
  swapWithMain,
} from '../state/windowOrder';

test('reconcileWindowOrder preserves existing order and appends new windows', () => {
  assert.deepEqual(
    reconcileWindowOrder(['b', 'a', 'missing'], ['a', 'b', 'c']),
    ['b', 'a', 'c'],
  );
});

test('nextIdInOrder wraps around', () => {
  assert.equal(nextIdInOrder(['a', 'b', 'c'], 'c', 1), 'a');
  assert.equal(nextIdInOrder(['a', 'b', 'c'], 'a', -1), 'c');
});

test('swapInOrder swaps with wrapped neighbor', () => {
  assert.deepEqual(swapInOrder(['a', 'b', 'c'], 'a', -1), ['c', 'b', 'a']);
  assert.deepEqual(swapInOrder(['a', 'b', 'c'], 'b', 1), ['a', 'c', 'b']);
});

test('swapWithMain promotes focused window', () => {
  assert.deepEqual(swapWithMain(['a', 'b', 'c'], 'c'), ['c', 'b', 'a']);
});
