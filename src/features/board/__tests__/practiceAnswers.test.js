import { describe, expect, it } from 'vitest';
import { clearPracticePatch, practiceEntries, practiceKey } from '../practiceAnswers';

describe('practiceEntries', () => {
  it('держит ответ каждого ученика отдельно и не теряет второй', () => {
    const props = {
      [practiceKey('a')]: { who: 'a', name: 'Аня', answer: '1,3', verdict: 'right' },
      [practiceKey('b')]: { who: 'b', name: 'Боря', answer: '2', verdict: 'wrong' },
    };
    const entries = practiceEntries(props);
    expect(entries.map((item) => item.who)).toEqual(['a', 'b']);
    expect(clearPracticePatch(props)).toMatchObject({
      [practiceKey('a')]: null,
      [practiceKey('b')]: null,
      practiceAnswers: [],
    });
  });

  it('новое поле заменяет старый общий список того же ученика', () => {
    const props = {
      practiceAnswers: [{ who: 'a', name: 'Аня', answer: '1' }],
      [practiceKey('a')]: { who: 'a', name: 'Аня', answer: '1,3', verdict: 'right' },
    };
    expect(practiceEntries(props)).toEqual([
      expect.objectContaining({ who: 'a', answer: '1,3' }),
    ]);
  });
});
