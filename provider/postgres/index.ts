import type {
  ItemsParams,
  ItemsResult,
  MentionsParams,
  MentionsResult,
  MetaResult,
} from '@openctx/provider';
import { PostgresClient } from './client.js';

/** Settings for the Postgres provider. */
export type Settings = {
  /** Database URL. */
  DB_URL: string;
};

let pgClient: undefined | PostgresClient = undefined;

const postgresContext = {
  meta(): MetaResult {
    return {
      name: 'Postgres',
      mentions: { label: 'Search by schema name...' },
    };
  },

  async initializePGClient(settingsInput: Settings) {
    if (pgClient === undefined) {
      pgClient = new PostgresClient(settingsInput.DB_URL);
      await pgClient.initializePGData();
    }
  },

  async mentions(
    params: MentionsParams,
    settingsInput: Settings
  ): Promise<MentionsResult> {
    await this.initializePGClient(settingsInput);
    if (!pgClient) {
      return [];
    }
    const userQuery = params.query ?? '';
    const schemas = pgClient.getSchemas();
    const schemaList = schemas.filter((schema) => schema.includes(userQuery));
    if (!schemaList) {
      return [];
    }
    const mentionRes: MentionsResult = [];
    for (const schema of schemaList) {
      mentionRes.push({
        title: schema,
        uri: schema,
        data: {
          schema,
        },
      });
    }
    return mentionRes;
  },

  async items(
    params: ItemsParams,
    settingsInput: Settings
  ): Promise<ItemsResult> {
    await this.initializePGClient(settingsInput);
    if (!pgClient) {
      return [];
    }
    const schema = params.mention?.data?.schema as string;
    let message = params.message || '';
    console.log({ schema, message });

    const schemaContext = await pgClient.getSchema(schema);
    return schemaContext;
  },
};

export default postgresContext;
