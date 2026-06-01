// 일회성 추출 스크립트 (T2.1): Raw Materials 엑셀 → prisma/data/items.json
// 실행: node prisma/extract-items.mjs   (xlsx devDependency 필요)
// 결정 CORE-3: 압출·성형 시트의 합집합(47품번). headPin 누락분은 최빈값으로,
// extrusionGroup은 출처 컬럼이 없어 정렬 인덱스 기반 1~8 버킷으로 결정적 부여.
import xlsx from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';

const norm = (s) => String(s ?? '').trim();

const ext = xlsx.readFile('Raw Materials/Extrusion/압출공정_제약조건.xlsx');
const eRows = xlsx.utils
  .sheet_to_json(ext.Sheets['Sheet1'], { header: 1, blankrows: false })
  .slice(1)
  .filter((r) => r[0]);

const mol = xlsx.readFile('Raw Materials/Vulcanization/성형공정_제약조건.xlsx');
const mRows = xlsx.utils
  .sheet_to_json(mol.Sheets['Sheet1 (2)'], { header: 1, blankrows: false })
  .slice(1)
  .filter((r) => r[0]);

const extByCode = new Map(eRows.map((r) => [norm(r[0]), r]));
const molByCode = new Map(mRows.map((r) => [norm(r[0]), r]));

const codes = [...new Set([...extByCode.keys(), ...molByCode.keys()])].sort();

const num = (v) => (typeof v === 'number' ? v : v == null || v === '' ? null : Number(v));

const items = codes.map((code, i) => {
  const e = extByCode.get(code);
  const m = molByCode.get(code);
  const headPin = e ? norm(e[6]) || '22*8' : '22*8'; // 누락 시 최빈값
  const line = e ? norm(e[9]) : '';
  return {
    productCode: code,
    material: 'silicone',
    extrusionGroup: (i % 8) + 1, // CORE-3: 출처 컬럼 부재 → 결정적 1~8 버킷
    headPin,
    cutLength: e ? num(e[8]) : null,
    extrusionSpeed: e ? num(e[5]) : null,
    extruderFord: line.includes('포드'),
    extruderNew: line.includes('뉴'),
    lpMoldsPerAngle: m ? num(m[4]) : null,
    icMoldsPerAngle: m ? num(m[10]) : null,
    lpPosTop: m ? norm(m[6]) === 'o' : false,
  };
});

mkdirSync('prisma/data', { recursive: true });
writeFileSync('prisma/data/items.json', `${JSON.stringify(items, null, 2)}\n`);
console.log(`✅ items.json 생성: ${items.length}품번`);
console.log('headPin 분포:', JSON.stringify(items.reduce((a, x) => ((a[x.headPin] = (a[x.headPin] || 0) + 1), a), {})));
console.log('E그룹·headPin 누락:', items.filter((x) => !x.extrusionGroup || !x.headPin).length);
