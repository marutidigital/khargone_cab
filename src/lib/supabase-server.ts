// src/lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

let serviceClient: ReturnType<typeof createClient> | null = null

// Helper mock builder for server-side JSON database operations
class MockBuilder {
  private table: string
  private filters: { field: string; value: any }[] = []
  private orderField: string | null = null
  private orderAscending: boolean = false
  private limitNum: number | null = null
  private isSingle: boolean = false
  
  private insertRowOrRows: any = null
  private updateData: any = null
  private isUpsert: boolean = false
  private upsertRowOrRows: any = null
  private upsertOptions: any = null

  constructor(table: string) {
    this.table = table
  }

  select(fields?: string) {
    void fields
    return this
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value })
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field
    this.orderAscending = options?.ascending ?? false
    return this
  }

  limit(num: number) {
    this.limitNum = num
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(rowOrRows: any) {
    this.insertRowOrRows = rowOrRows
    return this
  }

  update(updates: any) {
    this.updateData = updates
    return this
  }

  upsert(rowOrRows: any, options?: { onConflict?: string }) {
    this.isUpsert = true
    this.upsertRowOrRows = rowOrRows
    this.upsertOptions = options
    return this
  }

  private getFilePath() {
    const dir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return path.join(dir, `${this.table}.json`)
  }

  private readData(): any[] {
    const filePath = this.getFilePath()
    if (!fs.existsSync(filePath)) {
      return []
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
      return []
    }
  }

  private writeData(data: any[]) {
    const filePath = this.getFilePath()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  }

  private async executeQuery(): Promise<any> {
    try {
      // 1. Handle INSERT
      if (this.insertRowOrRows !== null) {
        const rows = Array.isArray(this.insertRowOrRows) ? this.insertRowOrRows : [this.insertRowOrRows]
        const currentData = this.readData()
        const insertedRows = rows.map(row => {
          const newRow = {
            id: row.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...row
          }
          if (this.table === 'bookings' && !newRow.booking_ref) {
            newRow.booking_ref = 'KC' + Math.floor(10000 + Math.random() * 90000)
          }
          return newRow
        })

        this.writeData([...insertedRows, ...currentData])
        const resData = Array.isArray(this.insertRowOrRows) ? insertedRows : insertedRows[0]
        return { data: resData, error: null }
      }

      // 2. Handle UPSERT
      if (this.isUpsert) {
        const rows = Array.isArray(this.upsertRowOrRows) ? this.upsertRowOrRows : [this.upsertRowOrRows]
        const currentData = this.readData()
        const onConflictField = this.upsertOptions?.onConflict || 'id'
        const updatedData = [...currentData]

        const upsertedRows = rows.map(row => {
          const existingIndex = updatedData.findIndex(item => item[onConflictField] === row[onConflictField])
          const newRow = {
            id: row.id || (existingIndex >= 0 ? updatedData[existingIndex].id : crypto.randomUUID()),
            created_at: existingIndex >= 0 ? updatedData[existingIndex].created_at : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...row
          }
          if (existingIndex >= 0) {
            updatedData[existingIndex] = newRow
          } else {
            updatedData.unshift(newRow)
          }
          return newRow
        })

        this.writeData(updatedData)
        const resData = Array.isArray(this.upsertRowOrRows) ? upsertedRows : upsertedRows[0]
        return { data: resData, error: null }
      }

      // 3. Handle UPDATE
      if (this.updateData !== null) {
        const currentData = this.readData()
        const updatedData = currentData.map(item => {
          let match = true
          for (const filter of this.filters) {
            if (item[filter.field] !== filter.value) {
              match = false
              break
            }
          }
          if (match) {
            return {
              ...item,
              ...this.updateData,
              updated_at: new Date().toISOString()
            }
          }
          return item
        })

        this.writeData(updatedData)
        return { data: null, error: null }
      }

      // 4. Handle SELECT (Read)
      let data = this.readData()

      // Apply filters
      for (const filter of this.filters) {
        data = data.filter(item => item[filter.field] === filter.value)
      }

      // Apply ordering
      if (this.orderField) {
        data.sort((a, b) => {
          const valA = a[this.orderField!]
          const valB = b[this.orderField!]
          if (valA < valB) return this.orderAscending ? -1 : 1
          if (valA > valB) return this.orderAscending ? 1 : -1
          return 0
        })
      }

      // Apply limit
      if (this.limitNum !== null) {
        data = data.slice(0, this.limitNum)
      }

      if (this.isSingle) {
        return { data: data[0] || null, error: null }
      } else {
        return { data, error: null }
      }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    return this.executeQuery().then(onfulfilled, onrejected)
  }
}

class MockSupabaseClient {
  from(table: string) {
    return new MockBuilder(table)
  }
  rpc(name: string) {
    if (name === 'generate_booking_ref') {
      const ref = 'KC' + Math.floor(10000 + Math.random() * 90000)
      return Promise.resolve({ data: ref, error: null })
    }
    return Promise.resolve({ data: null, error: new Error(`RPC ${name} not mocked`) })
  }
}

// Server client (service role — only used in API routes)
export function createServiceClient(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY
  const useLocalFallback = !supabaseUrl || supabaseUrl.includes('dummy') || !supabaseService || supabaseService.includes('dummy')

  if (useLocalFallback) {
    return new MockSupabaseClient()
  }

  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false }
    })
  }
  return serviceClient
}
