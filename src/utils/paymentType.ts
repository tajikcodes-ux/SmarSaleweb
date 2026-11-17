// The server stores CASH, BANK, CARD or CREDIT; older clients may still read 'cash' or be empty.
export const PAYMENT_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Наличный расчет' },
  { value: 'BANK', label: 'Безналичный расчет' },
  { value: 'CARD', label: 'Карта' },
  { value: 'CREDIT', label: 'Отсрочка (в долг)' },
];

const ALIASES: Record<string, string> = { cash: 'CASH', bank_transfer: 'BANK', bank: 'BANK', card: 'CARD', credit: 'CREDIT' };

export const normalizePaymentType = (value: unknown) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return 'CASH';
  return ALIASES[raw.toLowerCase()] ?? raw.toUpperCase();
};

export const isCashPaymentType = (value: unknown) => normalizePaymentType(value) === 'CASH';
