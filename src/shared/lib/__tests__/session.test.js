// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_EVENT, clearSession, parseSession, readStoredSession, saveSession, subscribeSession } from '../session';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('сессия', () => {
  it('читает localStorage, а при мусоре в нём — sessionStorage', () => {
    expect(readStoredSession()).toBeNull();
    sessionStorage.setItem('edu_session', JSON.stringify({ role: 'student', token: 's' }));
    localStorage.setItem('edu_session', '{битый json');
    expect(parseSession(readStoredSession())).toMatchObject({ role: 'student', token: 's' });
    localStorage.setItem('edu_session', JSON.stringify({ role: 'teacher', token: 't' }));
    expect(parseSession(readStoredSession())).toMatchObject({ role: 'teacher' });
  });

  it('без роли сессии нет', () => {
    expect(parseSession(JSON.stringify({ token: 't' }))).toBeNull();
    expect(parseSession('не json')).toBeNull();
    expect(parseSession(null)).toBeNull();
  });

  it('вход и выход оповещают подписчиков, снимок — строка из хранилища', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeSession(onChange);
    saveSession({ role: 'admin', token: 'a' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(readStoredSession()).toBe(JSON.stringify({ role: 'admin', token: 'a' }));
    clearSession();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(readStoredSession()).toBeNull();
    unsubscribe();
    window.dispatchEvent(new Event(SESSION_EVENT));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
