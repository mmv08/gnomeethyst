import test from 'node:test';
import assert from 'node:assert/strict';
import { columnLayout } from '../layouts/column';
import { fiveColumnMiddleLayout } from '../layouts/fiveColumnMiddle';
import { fullscreenLayout } from '../layouts/fullscreen';
import { tallLayout } from '../layouts/tall';
import { threeColumnMidFocusLayout } from '../layouts/threeColumnMidFocus';
import { wideLayout } from '../layouts/wide';
import type { DynamicLayout, ManagedWindow, Rect } from '../layouts/types';

const workArea: Rect = { x: 10, y: 20, width: 1000, height: 800 };
const ultrawide: Rect = { x: 0, y: 0, width: 2000, height: 1000 };

function windows(count: number): ManagedWindow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `w${index + 1}`,
    isFocused: index === 0,
  }));
}

function rect(layout: DynamicLayout, id: string, count: number): Rect {
  const assignment = layout.assign(windows(count), workArea, {
    mainPaneRatio: 0.5,
    mainPaneCount: 1,
  });
  const result = assignment.get(id);
  assert.ok(result, `${layout.name} did not assign ${id}`);
  return result;
}

function assertRect(actual: Rect, expected: Rect): void {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(actual).map(([key, value]) => [
        key,
        Number(value.toFixed(4)),
      ]),
    ),
    expected,
  );
}

test('Tall gives one window the full work area', () => {
  assertRect(rect(tallLayout, 'w1', 1), workArea);
});

test('Tall puts main left and stacks secondary windows right', () => {
  assertRect(rect(tallLayout, 'w1', 3), {
    x: 10,
    y: 20,
    width: 500,
    height: 800,
  });
  assertRect(rect(tallLayout, 'w2', 3), {
    x: 510,
    y: 20,
    width: 500,
    height: 400,
  });
  assertRect(rect(tallLayout, 'w3', 3), {
    x: 510,
    y: 420,
    width: 500,
    height: 400,
  });
});

test('Wide puts main top and secondary windows bottom', () => {
  assertRect(rect(wideLayout, 'w1', 3), {
    x: 10,
    y: 20,
    width: 1000,
    height: 400,
  });
  assertRect(rect(wideLayout, 'w2', 3), {
    x: 10,
    y: 420,
    width: 500,
    height: 400,
  });
  assertRect(rect(wideLayout, 'w3', 3), {
    x: 510,
    y: 420,
    width: 500,
    height: 400,
  });
});

test('Column creates full-height columns', () => {
  assertRect(rect(columnLayout, 'w1', 3), {
    x: 10,
    y: 20,
    width: 500,
    height: 800,
  });
  assertRect(rect(columnLayout, 'w2', 3), {
    x: 510,
    y: 20,
    width: 250,
    height: 800,
  });
  assertRect(rect(columnLayout, 'w3', 3), {
    x: 760,
    y: 20,
    width: 250,
    height: 800,
  });
});

test('Fullscreen assigns every window the full work area', () => {
  const assignment = fullscreenLayout.assign(windows(3), workArea, {
    mainPaneRatio: 0.5,
    mainPaneCount: 1,
  });
  for (const id of ['w1', 'w2', 'w3']) assertRect(assignment.get(id)!, workArea);
});

test('3Column Mid Focus uses small-screen fallback below 1400px', () => {
  const assignment = threeColumnMidFocusLayout.assign(windows(3), workArea, {
    mainPaneRatio: 0.5,
    mainPaneCount: 1,
  });

  assertRect(assignment.get('w1')!, {
    x: 10,
    y: 20,
    width: 550,
    height: 800,
  });
  assertRect(assignment.get('w2')!, {
    x: 560,
    y: 20,
    width: 450,
    height: 400,
  });
  assertRect(assignment.get('w3')!, {
    x: 560,
    y: 420,
    width: 450,
    height: 400,
  });
});

test('3Column Mid Focus centers the main window on wide screens', () => {
  const assignment = threeColumnMidFocusLayout.assign(windows(5), ultrawide, {
    mainPaneRatio: 0.5,
    mainPaneCount: 1,
  });

  assertRect(assignment.get('w1')!, {
    x: 380,
    y: 0,
    width: 1240,
    height: 1000,
  });
  assertRect(assignment.get('w2')!, {
    x: 0,
    y: 0,
    width: 380,
    height: 500,
  });
  assertRect(assignment.get('w3')!, {
    x: 1620,
    y: 0,
    width: 380,
    height: 500,
  });
});

test('5Column Middle uses the dotfiles ultrawide ratios and distribution', () => {
  const assignment = fiveColumnMiddleLayout.assign(windows(6), ultrawide, {
    mainPaneRatio: 0.5,
    mainPaneCount: 1,
  });

  assertRect(assignment.get('w1')!, {
    x: 660,
    y: 0,
    width: 680,
    height: 1000,
  });
  assertRect(assignment.get('w2')!, {
    x: 260,
    y: 0,
    width: 400,
    height: 500,
  });
  assertRect(assignment.get('w3')!, {
    x: 1340,
    y: 0,
    width: 400,
    height: 1000,
  });
  assertRect(assignment.get('w4')!, {
    x: 0,
    y: 0,
    width: 260,
    height: 1000,
  });
  assertRect(assignment.get('w5')!, {
    x: 1740,
    y: 0,
    width: 260,
    height: 1000,
  });
  assertRect(assignment.get('w6')!, {
    x: 260,
    y: 500,
    width: 400,
    height: 500,
  });
});

test('Paned layouts honor main pane count and ratio', () => {
  const state = {
    mainPaneRatio: 0.75,
    mainPaneCount: 2,
  };

  const tallAssignment = tallLayout.assign(windows(4), ultrawide, state);
  assertRect(tallAssignment.get('w1')!, {
    x: 0,
    y: 0,
    width: 1500,
    height: 500,
  });
  assertRect(tallAssignment.get('w3')!, {
    x: 1500,
    y: 0,
    width: 500,
    height: 500,
  });

  const wideAssignment = wideLayout.assign(windows(4), ultrawide, state);
  assertRect(wideAssignment.get('w2')!, {
    x: 1000,
    y: 0,
    width: 1000,
    height: 750,
  });
  assertRect(wideAssignment.get('w4')!, {
    x: 1000,
    y: 750,
    width: 1000,
    height: 250,
  });

  const columnAssignment = columnLayout.assign(windows(4), ultrawide, state);
  assertRect(columnAssignment.get('w2')!, {
    x: 750,
    y: 0,
    width: 750,
    height: 1000,
  });
  assertRect(columnAssignment.get('w4')!, {
    x: 1750,
    y: 0,
    width: 250,
    height: 1000,
  });
});
