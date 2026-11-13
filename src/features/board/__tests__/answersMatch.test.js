import { describe, expect, it } from 'vitest';
import { answersMatch } from '../studentsApi';

const options = ['ноль', 'один', 'два', 'три'];

describe('answersMatch', () => {
  it('считает верным весь набор правильных вариантов', () => {
    expect(answersMatch('1,3', '1,3', options)).toBe(true);
    expect(answersMatch('1,3', '3,1', options)).toBe(true);
    expect(answersMatch('1,3', '3; 1', options)).toBe(true);
    expect(answersMatch('1,3', '1 3', options)).toBe(true);
    expect(answersMatch('2,10', '10,2', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).toBe(true);
  });

  it('не принимает часть набора и лишний вариант', () => {
    expect(answersMatch('1', '1,3', options)).toBe(false);
    expect(answersMatch('1,2,3', '1,3', options)).toBe(false);
    expect(answersMatch('2', '1,3', options)).toBe(false);
  });

  it('сверяет несколько правильных вариантов по их тексту', () => {
    expect(answersMatch('1,4', 'ноль; три', options)).toBe(true);
    expect(answersMatch('1,4', 'три, ноль', options)).toBe(true);
    expect(answersMatch('1', '0', ['0', '1', '2'])).toBe(true);
    expect(answersMatch('1,3', '0;2', ['0', '1', '2'])).toBe(true);
  });

  it('оставляет номер приоритетнее текста варианта', () => {
    expect(answersMatch('2', '2', ['0', '1', '2'])).toBe(true);
    expect(answersMatch('3', '2', ['0', '1', '2'])).toBe(false);
  });
});
