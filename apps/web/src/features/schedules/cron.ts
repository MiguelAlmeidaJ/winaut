export const weekdayOptions = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
] as const;

const weekdayLabels: ReadonlyMap<string, string> = new Map(
  weekdayOptions.map((option) => [option.value, option.label]),
);

export function buildWeeklyCron(weekday: string, time: string): string {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const day = Number(weekday);

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !Number.isInteger(day) ||
    day < 0 ||
    day > 6
  ) {
    throw new Error('Dia da semana ou horário inválido.');
  }

  return `0 ${minute} ${hour} * * ${day}`;
}

export function describeCron(cronExpression: string): string {
  const match = cronExpression.match(
    /^0\s+(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+([0-6])$/,
  );

  if (!match) {
    return cronExpression;
  }

  const [, minuteText, hourText, weekday] = match;
  const minute = Number(minuteText);
  const hour = Number(hourText);

  if (minute > 59 || hour > 23) {
    return cronExpression;
  }

  const label = weekdayLabels.get(weekday);

  if (!label) {
    return cronExpression;
  }

  return `${label} às ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
