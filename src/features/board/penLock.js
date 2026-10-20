// Пока кисть ведёт линию, тяжёлый опрос GeoGebra пропускает тики.
let active = false;

export function setPenActive(value) {
  active = Boolean(value);
}

export function penActive() {
  return active;
}
