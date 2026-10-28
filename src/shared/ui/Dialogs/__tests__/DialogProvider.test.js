// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import DialogProvider from '../DialogProvider';
import { useConfirm, useNotify } from '../dialogsContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null;
let host = null;

function mount() {
  const api = {};
  function Probe() {
    api.confirm = useConfirm();
    api.notify = useNotify();
    return null;
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(DialogProvider, null, createElement(Probe))));
  return api;
}

const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label);

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  vi.useRealTimers();
});

describe('DialogProvider', () => {
  it('confirm ждёт ответа: кнопка подтверждения — true, Esc — false', async () => {
    const api = mount();
    let answer;
    act(() => { api.confirm('Удалить тест?', { danger: true, confirmLabel: 'Удалить' }).then((v) => { answer = v; }); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog.textContent).toContain('Удалить тест?');
    expect(document.activeElement).toBe(button('Удалить'));
    await act(async () => button('Удалить').click());
    expect(answer).toBe(true);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

    act(() => { api.confirm('Ещё раз?').then((v) => { answer = v; }); });
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(answer).toBe(false);
  });

  it('два confirm подряд показываются по очереди', async () => {
    const api = mount();
    const answers = [];
    act(() => {
      api.confirm('Первый').then((v) => answers.push(['1', v]));
      api.confirm('Второй').then((v) => answers.push(['2', v]));
    });
    expect(document.querySelector('[role="alertdialog"]').textContent).toContain('Первый');
    await act(async () => button('Отмена').click());
    expect(document.querySelector('[role="alertdialog"]').textContent).toContain('Второй');
    await act(async () => button('ОК').click());
    expect(answers).toEqual([['1', false], ['2', true]]);
  });

  it('notify показывает сообщение и сам его убирает', () => {
    vi.useFakeTimers();
    const api = mount();
    act(() => api.notify('Не удалось сохранить'));
    act(() => api.notify('Сохранено', 'success'));
    expect(document.querySelector('[role="alert"]').textContent).toContain('Не удалось сохранить');
    expect(document.querySelector('[role="status"]').textContent).toContain('Сохранено');
    act(() => vi.advanceTimersByTime(6000));
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});
