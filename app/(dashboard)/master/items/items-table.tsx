'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  updateItemField,
  addItemAlias,
  removeItemAlias,
} from '@/lib/master/item-actions';
import { filterByMaterial, countByMaterial, type MaterialFilter } from '@/lib/material/filter';
import { MATERIALS, MATERIAL_LABEL } from '@/lib/material/material';

export interface ItemRow {
  id: string;
  productCode: string;
  material: string;
  customerCode: string | null;
  hwasungCode: string | null;
  headPin: string | null;
  extrusionGroup: number | null;
  cutLength: number | null;
  extruderFord: boolean;
  extruderNew: boolean;
  lpMoldsPerAngle: number | null;
  icMoldsPerAngle: number | null;
  lpPosTop: boolean;
  updatedAt: string;
  aliases: { id: string; alias: string }[];
}

function EditableCell({
  row,
  field,
  value,
}: {
  row: ItemRow;
  field: string;
  value: string | number | null;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (draft === (value === null ? '' : String(value))) return;
    startTransition(async () => {
      const res = await updateItemField(row.id, field, draft, row.updatedAt);
      setMsg(res.ok ? null : res.message);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        disabled={pending}
        className="w-full rounded border border-input bg-background px-2 py-1 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={field}
      />
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

function ExtruderCell({ row }: { row: ItemRow }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(field: 'extruderFord' | 'extruderNew', next: boolean) {
    startTransition(async () => {
      const res = await updateItemField(row.id, field, String(next), row.updatedAt);
      setMsg(res.ok ? null : res.message);
    });
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={row.extruderFord}
          disabled={pending}
          onChange={(e) => toggle('extruderFord', e.target.checked)}
        />
        FORD
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={row.extruderNew}
          disabled={pending}
          onChange={(e) => toggle('extruderNew', e.target.checked)}
        />
        NEW
      </label>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

function BoolCell({ row, field, value }: { row: ItemRow; field: string; value: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <input
        type="checkbox"
        checked={value}
        disabled={pending}
        aria-label={field}
        onChange={(e) =>
          startTransition(async () => {
            const res = await updateItemField(row.id, field, String(e.target.checked), row.updatedAt);
            setMsg(res.ok ? null : res.message);
          })
        }
      />
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

function AliasManager({ row }: { row: ItemRow }) {
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        별칭 {row.aliases.length > 0 ? `(${row.aliases.length})` : ''}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-semibold">별칭 관리 — {row.productCode}</h2>
            <ul className="mb-4 flex flex-col gap-2">
              {row.aliases.length === 0 && (
                <li className="text-sm text-muted-foreground">등록된 별칭이 없습니다.</li>
              )}
              {row.aliases.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <span>{a.alias}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await removeItemAlias(a.id);
                        setMsg(res.ok ? null : res.message);
                      })
                    }
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="새 별칭 (예: 25474-2S010)"
              />
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await addItemAlias(row.id, alias);
                    setMsg(res.ok ? null : res.message);
                    if (res.ok) setAlias('');
                  })
                }
              >
                추가
              </Button>
            </div>
            {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
            <div className="mt-4 text-right">
              <Button variant="outline" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ItemsTable({ rows }: { rows: ItemRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>('ALL');

  const counts = useMemo(() => countByMaterial(rows), [rows]);
  const filteredRows = useMemo(() => filterByMaterial(rows, materialFilter), [rows, materialFilter]);

  const columns = useMemo<ColumnDef<ItemRow>[]>(
    () => [
      { accessorKey: 'productCode', header: '품번', enableSorting: true },
      {
        accessorKey: 'material',
        header: '자재',
        enableSorting: true,
        cell: ({ row }) => MATERIAL_LABEL[row.original.material as keyof typeof MATERIAL_LABEL] ?? row.original.material,
      },
      {
        accessorKey: 'customerCode',
        header: '고객사 품번',
        cell: ({ row }) => <EditableCell row={row.original} field="customerCode" value={row.original.customerCode} />,
      },
      {
        accessorKey: 'headPin',
        header: '헤드/핀',
        cell: ({ row }) => <EditableCell row={row.original} field="headPin" value={row.original.headPin} />,
      },
      {
        accessorKey: 'extrusionGroup',
        header: 'E그룹',
        enableSorting: true,
        cell: ({ row }) => <EditableCell row={row.original} field="extrusionGroup" value={row.original.extrusionGroup} />,
      },
      {
        accessorKey: 'cutLength',
        header: '재단길이',
        cell: ({ row }) => <EditableCell row={row.original} field="cutLength" value={row.original.cutLength} />,
      },
      {
        id: 'extruder',
        header: '압출라인',
        cell: ({ row }) => <ExtruderCell row={row.original} />,
      },
      {
        accessorKey: 'lpMoldsPerAngle',
        header: 'LP금형/앵글',
        cell: ({ row }) => <EditableCell row={row.original} field="lpMoldsPerAngle" value={row.original.lpMoldsPerAngle} />,
      },
      {
        accessorKey: 'icMoldsPerAngle',
        header: 'IC금형/앵글',
        cell: ({ row }) => <EditableCell row={row.original} field="icMoldsPerAngle" value={row.original.icMoldsPerAngle} />,
      },
      {
        accessorKey: 'lpPosTop',
        header: 'LP상단',
        cell: ({ row }) => <BoolCell row={row.original} field="lpPosTop" value={row.original.lpPosTop} />,
      },
      {
        id: 'aliases',
        header: '별칭',
        cell: ({ row }) => <AliasManager row={row.original} />,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="품번·고객사 품번 검색"
          className="max-w-xs"
        />
        <select
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value as MaterialFilter)}
          aria-label="자재 필터"
          className="h-10 rounded-md border border-input bg-background px-3 text-base"
        >
          <option value="ALL">전체 자재 ({rows.length})</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {MATERIAL_LABEL[m]} ({counts[m] ?? 0})
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-base">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="cursor-pointer px-3 py-2 text-left font-semibold"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2 align-top">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{table.getRowModel().rows.length}건 표시</p>
    </div>
  );
}
