import type { ItemsResult } from '@openctx/provider';
import dedent from 'dedent';
import postgres from 'postgres';

export class PostgresClient {
  private readonly sql: postgres.Sql;
  public schemas: string[] = [];

  constructor(DB_URL: string) {
    this.sql = postgres(DB_URL);
  }

  public getSchemas(): string[] {
    return this.schemas;
  }

  public async getSchema(schema: string): Promise<ItemsResult> {
    const res = await this.sql<
      { ['table_name']: string; [key: string]: any }[]
    >`
        SELECT table_name, column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        where table_schema = '${this.sql.unsafe(schema)}'`;

    const schemaDDL = this.schemaToDDL(res);

    const schemaPrompt = dedent`
        The reference database schema for this question is ${schemaDDL}. 
        IMPORTANT: Be sure you only use the tables and columns from this schema in your answer.
    `;

    return [
      {
        title: schema,
        ai: { content: schemaPrompt },
      },
    ];
  }

  // ----------- Helper function ---------------

  private schemaToDDL(
    schema: { ['table_name']: string; [key: string]: any }[]
  ) {
    const tables: { [key: string]: any } = {};
    for (let row of schema) {
      tables[row.table_name] = row;
    }
    const out = [];
    const tableNames = Object.keys(tables);
    for (let table of tableNames) {
      const sql = [`create table ${table}(\n`];
      const cols = schema.filter((s) => s.table_name === table);
      for (let c of cols) {
        let colSql = '';
        //if (c.column_name === null || c.column_name === "") continue;
        colSql = `  ${c.column_name} ${c.data_type}`;
        if (c.is_nullable === 'NO') colSql += ' not null ';
        if (c.column_default === 'NO')
          colSql += ` default ${c.column_default} `;
        colSql += ',\n';
        sql.push(colSql);
      }
      sql.push(');');
      out.push(sql.join(''));
    }
    return out.join('\n');
  }

  // ----------- Initialization function ---------------

  public async initializePGData() {
    await this.initializeSchemas();
  }

  private async initializeSchemas() {
    const schemas = await this.sql`
      select schema_name
        from information_schema.schemata;
    `;
    console.log({ schemas });
    this.schemas = schemas.map((schema) => schema.schema_name);
  }
}
