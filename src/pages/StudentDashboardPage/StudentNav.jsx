import RoleNav from '../../shared/ui/RoleNav';

export const STUDENT_TABS = [
  { key: 'theory', label: 'Теория' },
  { key: 'tests', label: 'Тесты' },
  { key: 'history', label: 'История' },
  { key: 'stats', label: 'Статистика' },
  { key: 'profile', label: 'Профиль' },
];

export default function StudentNav({ displayName, activeKey, onSelect }) {
  return (
    <RoleNav
      tabs={STUDENT_TABS}
      activeKey={activeKey}
      onSelect={onSelect}
      displayName={displayName}
    />
  );
}
