export const ADMIN_PATHS = {
  create: '/admin/create',
  bank: '/admin/bank',
  theory: '/admin/theory',
  library: '/admin/library',
  users: '/admin/users',
  batch: '/admin/batch',
  access: '/admin/access',
};

export const ADMIN_TAB_ALIASES = {
  create: 'create',
  bank: 'bank',
  theoryConstructor: 'theory',
  theoryBank: 'library',
  users: 'users',
  batch: 'batch',
  access: 'access',
};

export const ADMIN_TABS = [
  { key: 'create', label: 'Создать' },
  { key: 'bank', label: 'Банк' },
  { key: 'theory', label: 'Теория+' },
  { key: 'library', label: 'Библиотека' },
  { key: 'users', label: 'Юзеры' },
  { key: 'batch', label: 'Batch' },
  { key: 'access', label: 'Доступ' },
];

export function adminTabFromPath(pathname) {
  if (pathname.startsWith('/admin/create')) return 'create';
  if (pathname.startsWith('/admin/bank')) return 'bank';
  if (pathname.startsWith('/admin/theory')) return 'theory';
  if (pathname.startsWith('/admin/library')) return 'library';
  if (pathname.startsWith('/admin/batch')) return 'batch';
  if (pathname.startsWith('/admin/access')) return 'access';
  if (pathname.startsWith('/admin/users')) return 'users';
  return 'create';
}
