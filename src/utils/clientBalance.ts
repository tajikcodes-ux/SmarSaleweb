// A negative currentDebt means the client overpaid: it is an advance, not a debt.
export const clientBalance = (value: unknown) => {
  const balance = Number(value) || 0;
  const isAdvance = balance < 0;
  return {
    isAdvance,
    label: isAdvance ? 'Аванс' : 'Долг',
    amount: Math.abs(balance),
  };
};
