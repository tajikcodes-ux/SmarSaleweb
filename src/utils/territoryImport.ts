import * as XLSX from 'xlsx-js-style';

/** Row of the client import, in the column names of the Smartup import template. */
export interface TerritoryRow {
  room_code?: string;
  room_name?: string;
  robot_code?: string;
  robot_name?: string;
  person_code?: string;
  person_name?: string;
  address?: string;
  address_guide?: string;
  region_name?: string;
  town_name?: string;
  channel?: string;
  brand?: string;
  visit_days?: string;
  period?: string;
  start_date?: string;
  phone?: string;
  tin?: string;
  latitude?: string;
  longitude?: string;
}

export interface PlanRow {
  date?: string | number;
  clientCode?: string;
  clientName?: string;
  sequence?: number;
}

export type ParsedFile =
  | { kind: 'clients'; rows: TerritoryRow[]; columns: string[]; source: 'excel' | 'smartup-json' }
  | { kind: 'plan'; rows: PlanRow[]; columns: string[] };

/** Smartup template names first, then the Russian headers people actually type. */
const COLUMN_ALIASES: Array<[keyof TerritoryRow, string[]]> = [
  ['room_code', ['room_code', 'код рабочей зоны', 'код зоны', 'код сектора']],
  ['room_name', ['room_name', 'рабочая зона', 'сектор', 'зона']],
  ['robot_code', ['robot_code', 'код штатной единицы', 'код агента', 'штатная единица код']],
  ['robot_name', ['robot_name', 'штатная единица', 'агент', 'торговый представитель']],
  ['person_code', ['person_code', 'код клиента', 'код точки', 'код']],
  ['person_name', ['person_name', 'клиент', 'название точки', 'торговая точка', 'наименование', 'название']],
  ['address_guide', ['address_guide', 'ориентир']],
  ['address', ['address', 'адрес']],
  ['region_name', ['region_name', 'регион', 'район', 'область']],
  ['town_name', ['town_name', 'город', 'населенный пункт', 'населённый пункт', 'направление']],
  ['channel', ['channel', 'legal_person_group_name1', 'канал', 'группа']],
  ['brand', ['brand', 'бренд']],
  ['visit_days', ['visit_days', 'дни визита', 'дни посещения', 'день визита', 'текущий план', 'план']],
  ['period', ['period', 'периодичность', 'период']],
  ['start_date', ['start_date', 'дата начала', 'начало']],
  ['phone', ['phone', 'телефон']],
  ['tin', ['tin', 'инн']],
  ['latitude', ['latitude', 'широта', 'lat']],
  ['longitude', ['longitude', 'долгота', 'lon', 'lng']],
];

const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim());

/** Column index per field; each column is used once, exact names win over partial ones. */
function mapColumns<K extends string>(headers: string[], aliases: Array<[K, string[]]>) {
  const lower = headers.map((h) => text(h).toLowerCase());
  const taken = new Set<number>();
  const result = new Map<K, number>();
  for (const exact of [true, false]) {
    for (const [field, names] of aliases) {
      if (result.has(field)) continue;
      const index = lower.findIndex((h, i) => !taken.has(i) && h !== '' && names.some((n) => (exact ? h === n : h.includes(n))));
      if (index !== -1) {
        result.set(field, index);
        taken.add(index);
      }
    }
  }
  return result;
}

/** The monthly draft (sheet "Маршрут": Дата, Код клиента, Клиент, №) is a plan, not a client list. */
function isPlanSheet(headers: string[]) {
  const lower = headers.map((h) => text(h).toLowerCase());
  return lower.includes('дата') && lower.some((h) => h.includes('код клиента'));
}

function parsePlan(rows: any[][]): ParsedFile {
  const headers = rows[0].map(text);
  const columns = mapColumns(headers, [
    ['date', ['дата', 'date']],
    ['clientCode', ['код клиента', 'person_code']],
    ['clientName', ['клиент', 'person_name']],
    ['sequence', ['№', 'порядок', 'sequence']],
  ] as Array<['date' | 'clientCode' | 'clientName' | 'sequence', string[]]>);
  const at = (row: any[], field: 'date' | 'clientCode' | 'clientName' | 'sequence') => {
    const index = columns.get(field);
    return index === undefined ? undefined : row[index];
  };
  const plan: PlanRow[] = rows.slice(1)
    .filter((row) => row && (text(at(row, 'clientCode')) || text(at(row, 'clientName'))))
    .map((row) => ({
      date: at(row, 'date'),
      clientCode: text(at(row, 'clientCode')),
      clientName: text(at(row, 'clientName')),
      sequence: Number(at(row, 'sequence')) || undefined,
    }));
  return { kind: 'plan', rows: plan, columns: [...columns.keys()] };
}

function parseClientSheet(rows: any[][]): ParsedFile {
  const headers = rows[0].map(text);
  const columns = mapColumns(headers, COLUMN_ALIASES);
  if (!columns.has('person_name')) {
    throw new Error('Нет колонки с названием клиента (person_name или «Клиент»).');
  }
  const parsed: TerritoryRow[] = [];
  for (const row of rows.slice(1)) {
    if (!row) continue;
    const item: TerritoryRow = {};
    for (const [field, index] of columns) {
      const value = row[index];
      // Dates stay as Excel serials or text; the server understands both
      if (value !== undefined && value !== null && text(value) !== '') (item as any)[field] = typeof value === 'number' && field === 'start_date' ? value : text(value);
    }
    if (item.person_name) parsed.push(item);
  }
  return { kind: 'clients', rows: parsed, columns: [...columns.keys()], source: 'excel' };
}

/**
 * Table dump of Smartup's visit plan screen (person_visit_plan_template_list:table): rows of
 * [name, short name, plan start, days, channel, group2..5, ..., code] with the column names in meta.
 */
function parseSmartupJson(json: any): ParsedFile {
  const data: any[][] = Array.isArray(json?.data) ? json.data : [];
  if (data.length === 0) throw new Error('В файле Smartup нет строк data.');
  const rows: TerritoryRow[] = data.map((r) => ({
    person_name: text(r[0]),
    start_date: text(r[2]) || undefined,
    visit_days: text(r[3]) || undefined,
    channel: text(r[4]) || undefined,
    person_code: text(r[r.length - 1]) || undefined,
  })).filter((r) => r.person_name);
  return { kind: 'clients', rows, columns: ['person_name', 'start_date', 'visit_days', 'channel', 'person_code'], source: 'smartup-json' };
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  if (file.name.toLowerCase().endsWith('.json')) {
    return parseSmartupJson(JSON.parse(await file.text()));
  }
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  // The December draft keeps the plan on the sheet "Маршрут"; otherwise the first sheet
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase() === 'маршрут') ?? workbook.SheetNames[0];
  const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true });
  if (rows.length < 2) throw new Error('Файл пуст или в нём нет строк с данными.');
  return isPlanSheet(rows[0]) ? parsePlan(rows) : parseClientSheet(rows);
}

/** Empty import template in the Smartup column names. */
export function downloadTemplate() {
  const headers = ['room_code', 'room_name', 'robot_code', 'robot_name', 'person_code', 'person_name', 'address', 'address_guide',
    'region_name', 'town_name', 'channel', 'visit_days', 'period', 'start_date', 'phone', 'latitude', 'longitude'];
  const example = ['100_4', 'Регион Актив Шахзод', '296135', '4_Агент БХ Вохидов Ш RRP 1', '20451591', 'DOKON AKMAL KUCHKAK',
    'Конибодом, Кучкак', 'возле мечети', 'Согдийская область', 'Конибодом', 'KONIBODOM', 'Вт, Пт', 'Каждую неделю', '01.12.2026', '', '', ''];
  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Клиенты');
  XLSX.writeFile(book, 'shablon_importa_smartup.xlsx');
}
