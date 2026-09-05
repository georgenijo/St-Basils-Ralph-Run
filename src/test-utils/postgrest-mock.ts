/**
 * Minimal in-memory PostgREST query mock for unit-testing server components
 * and actions that build Supabase queries. Implements the subset of the
 * query-builder API the app uses (select/eq/is/not/lt/gte/or/order/range/limit)
 * with PostgREST semantics: filters compose with AND, `count: 'exact'` reflects
 * the filtered total before range/limit, and ordering treats nulls like
 * Postgres (NULLS LAST ascending, NULLS FIRST descending).
 */

export type Row = Record<string, unknown>

export interface QueryOp {
  method: string
  args: unknown[]
}

interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
}

interface QueryResult {
  data: Row[] | null
  count: number | null
  error: null
}

function matches(value: unknown, op: 'eq' | 'gt' | 'gte' | 'lt' | 'is', target: unknown): boolean {
  if (op === 'is') return target === null && (value === null || value === undefined)
  if (value === null || value === undefined) return false

  if (op === 'eq') {
    if (typeof value === 'boolean') return value === (target === true || target === 'true')
    if (typeof value === 'number') return value === Number(target)
    return String(value) === String(target)
  }

  // gt / gte / lt: numeric when both sides are numeric, else string comparison
  // (correct for ISO 8601 timestamps).
  if (typeof value === 'number') {
    const numericTarget = Number(target)
    if (op === 'gt') return value > numericTarget
    return op === 'gte' ? value >= numericTarget : value < numericTarget
  }
  const left = String(value)
  const right = String(target)
  if (op === 'gt') return left > right
  return op === 'gte' ? left >= right : left < right
}

function compareValues(a: unknown, b: unknown, ascending: boolean): number {
  const aNull = a === null || a === undefined
  const bNull = b === null || b === undefined
  if (aNull && bNull) return 0
  // Postgres defaults: NULLS LAST for ASC, NULLS FIRST for DESC.
  if (aNull) return ascending ? 1 : -1
  if (bNull) return ascending ? -1 : 1

  let cmp: number
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b
  } else {
    cmp = String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
  }
  return ascending ? cmp : -cmp
}

/** Parse one `column.operator.value` condition from an `.or()` expression. */
function parseOrCondition(condition: string): (row: Row) => boolean {
  const firstDot = condition.indexOf('.')
  const secondDot = condition.indexOf('.', firstDot + 1)
  const column = condition.slice(0, firstDot)
  const op = condition.slice(firstDot + 1, secondDot)
  const rawValue = condition.slice(secondDot + 1)

  if (op === 'is') return (row) => matches(row[column], 'is', rawValue === 'null' ? null : rawValue)
  if (op === 'eq' || op === 'gt' || op === 'gte' || op === 'lt') {
    return (row) => matches(row[column], op, rawValue)
  }
  throw new Error(`postgrest-mock: unsupported .or() operator "${op}" in "${condition}"`)
}

class PostgrestQueryMock implements PromiseLike<QueryResult> {
  private filters: ((row: Row) => boolean)[] = []
  private orderings: { column: string; ascending: boolean }[] = []
  private rangeBounds: { from: number; to: number } | null = null
  private limitCount: number | null = null
  private selectOptions: SelectOptions = {}

  constructor(
    private rows: Row[],
    private opsLog: QueryOp[]
  ) {}

  private record(method: string, args: unknown[]): this {
    this.opsLog.push({ method, args })
    return this
  }

  select(columns?: string, options: SelectOptions = {}): this {
    this.selectOptions = options
    return this.record('select', [columns, options])
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => matches(row[column], 'eq', value))
    return this.record('eq', [column, value])
  }

  is(column: string, value: null): this {
    this.filters.push((row) => matches(row[column], 'is', value))
    return this.record('is', [column, value])
  }

  not(column: string, operator: string, value: unknown): this {
    if (operator !== 'is') {
      throw new Error(`postgrest-mock: unsupported .not() operator "${operator}"`)
    }
    this.filters.push((row) => !matches(row[column], 'is', value as null))
    return this.record('not', [column, operator, value])
  }

  lt(column: string, value: unknown): this {
    this.filters.push((row) => matches(row[column], 'lt', value))
    return this.record('lt', [column, value])
  }

  gte(column: string, value: unknown): this {
    this.filters.push((row) => matches(row[column], 'gte', value))
    return this.record('gte', [column, value])
  }

  lte(column: string, value: unknown): this {
    this.filters.push(
      (row) => matches(row[column], 'lt', value) || matches(row[column], 'eq', value)
    )
    return this.record('lte', [column, value])
  }

  or(expression: string): this {
    const conditions = expression.split(',').map(parseOrCondition)
    this.filters.push((row) => conditions.some((condition) => condition(row)))
    return this.record('or', [expression])
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderings.push({ column, ascending: options.ascending ?? true })
    return this.record('order', [column, options])
  }

  range(from: number, to: number): this {
    this.rangeBounds = { from, to }
    return this.record('range', [from, to])
  }

  limit(count: number): this {
    this.limitCount = count
    return this.record('limit', [count])
  }

  private execute(): QueryResult {
    let result = this.rows.filter((row) => this.filters.every((filter) => filter(row)))

    // PostgREST reports the count of all rows matching the filters,
    // independent of range/limit.
    const count = this.selectOptions.count ? result.length : null

    if (this.orderings.length > 0) {
      result = [...result].sort((a, b) => {
        for (const { column, ascending } of this.orderings) {
          const cmp = compareValues(a[column], b[column], ascending)
          if (cmp !== 0) return cmp
        }
        return 0
      })
    }

    if (this.rangeBounds) {
      result = result.slice(this.rangeBounds.from, this.rangeBounds.to + 1)
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount)
    }

    return {
      data: this.selectOptions.head ? null : result,
      count,
      error: null,
    }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export interface SupabaseQueryMock {
  client: { from: (table: string) => PostgrestQueryMock }
  /** Ops recorded per table, one entry per `from()` call, in call order. */
  ops: Record<string, QueryOp[][]>
}

export function createSupabaseQueryMock(tables: Record<string, Row[]>): SupabaseQueryMock {
  const ops: Record<string, QueryOp[][]> = {}
  return {
    client: {
      from(table: string) {
        const callOps: QueryOp[] = []
        ;(ops[table] ??= []).push(callOps)
        return new PostgrestQueryMock(tables[table] ?? [], callOps)
      },
    },
    ops,
  }
}
