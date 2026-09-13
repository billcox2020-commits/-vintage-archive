import fs from 'node:fs';

const inputFiles = process.argv.slice(2);
if (!inputFiles.length) throw new Error('Pass one or more Bunjang search JSON files.');

const records = inputFiles.flatMap((file) => {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  return payload?.data?.responses?.mainGrid?.searchResponse?.data ?? [];
});

const normalize = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[^0-9a-z가-힣]/g, '');

function categoryFor(name, categoryLabels = '') {
  const n = `${name} ${categoryLabels}`.toLowerCase();
  if (/팬츠|바지|청바지|데님(?!\s*(캡|모자))|진스(?!\s*(캡|모자))|오버롤/.test(n)) return 'bottom';
  if (/패딩|자켓|재킷|점퍼|발토르|발토로|히말라야|눕시|라이더|봄버|블레이저|코트|후리스|플리스/.test(n)) return 'outer';
  if (/셔츠|남방|티셔츠|반팔|긴팔|후드|맨투맨|니트|가디건|져지|저지|스웨터|상의|스웨트/.test(n)) return 'top';
  if (/에어포스|에어 포스|조던|덩크|반달|vandal|코르테즈|스니커|부츠|슈즈|신발|운동화|우븐|줌플라이트|빅나이키|터미네이터|루부탱|첼시|하이탑|로우탑/.test(n)) return 'shoes';
  return 'etc';
}

function brandFor(name, apiBrand = '') {
  const n = `${name} ${apiBrand}`.toLowerCase();
  if (/조던|jordan/.test(n)) return 'JORDAN';
  if (/나이키|nike|에어포스|에어 포스|덩크|반달|vandal|코르테즈|줌플라이트|빅나이키|터미네이터/.test(n)) return 'NIKE';
  if (/노스페이스|north face|발토르|발토로|히말라야|눕시|세븐써밋/.test(n)) return 'THE NORTH FACE';
  if (/생로랑|saint laurent|ysl/.test(n)) return 'SAINT LAURENT';
  if (/디올|dior/.test(n)) return 'DIOR HOMME';
  if (/폴로스포츠|폴로 스포츠|polo sport/.test(n)) return 'POLO SPORT';
  if (/폴로|랄프로렌|ralph lauren/.test(n)) return 'POLO RALPH LAUREN';
  if (/아르마니|armani/.test(n)) return 'ARMANI';
  if (/슈프림|supreme/.test(n)) return 'SUPREME';
  if (/지샥|g-shock|gshock|카시오/.test(n)) return 'G-SHOCK';
  if (/루부탱|louboutin/.test(n)) return 'CHRISTIAN LOUBOUTIN';
  if (/몽클레어|moncler/.test(n)) return 'MONCLER';
  if (/리복|reebok/.test(n)) return 'REEBOK';
  if (/아디다스|adidas/.test(n)) return 'ADIDAS';
  return 'OTHER';
}

function yearFor(name) {
  const text = String(name);
  const full = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
  if (full) return Number(full[1]);
  const short = text.match(/(?:^|\D)(\d{2})(?:년|년도|s\b|fw\b|ss\b|f\/w|s\/s)/i);
  if (!short) return undefined;
  const value = Number(short[1]);
  return value >= 80 ? 1900 + value : 2000 + value;
}

function imageFor(template) {
  return String(template ?? '').replace('{res}', '400');
}

const seenPid = new Set();
const seenExact = new Set();
const items = [];

for (const record of records) {
  if (record?.status !== 'SELLING' || !record?.pid || !record?.name) continue;
  const pid = String(record.pid);
  let detail;
  try {
    detail = JSON.parse(fs.readFileSync(`/tmp/bunjang-details/${pid}.json`, 'utf8'))?.data?.product;
  } catch {
    detail = undefined;
  }
  if (detail && (detail.saleStatus !== 'SELLING' || detail.isHidden)) continue;
  const exact = normalize(record.name);
  if (seenPid.has(pid) || seenExact.has(exact)) continue;
  seenPid.add(pid);
  seenExact.add(exact);

  const title = String(detail?.name ?? record.name).trim();
  const year = yearFor(title);
  const categoryLabels = (detail?.categories ?? []).map((entry) => entry?.name).filter(Boolean).join(' ');
  const size = (detail?.options ?? []).find((entry) => /사이즈/i.test(entry?.optionGroupName ?? ''))?.optionValue;
  const item = {
    id: `BJ-${pid}`,
    category: categoryFor(title, categoryLabels),
    brand: brandFor(title, detail?.brand?.name),
    source: 'bunjang',
    title,
    source_url: `https://m.bunjang.co.kr/products/${pid}`,
    image: imageFor(detail?.imageUrl?.replace('{cnt}', '1') ?? record.productImage),
    price_krw: Number.isFinite(detail?.price) ? detail.price : (Number.isFinite(record.price) ? record.price : undefined),
    status: 'for_sale',
    status_text: '판매 중',
    checked_at: '2026-09-14',
    description: '번개장터 올콜렉터 상점의 현재 판매중 목록에서 확인.'
  };
  if (year) item.year = year;
  if (size) item.size = String(size);
  items.push(item);
}

const output = {
  generated_at: '2026-09-14',
  source: 'Bunjang / 올콜렉터 shop 4934829',
  rule: 'Bunjang search API status SELLING only. Product IDs and exact normalized titles are deduplicated.',
  count: items.length,
  items
};

fs.writeFileSync('data/bunjang-active.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ input: records.length, published: items.length }, null, 2));
