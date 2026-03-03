export type {
  Deployment,
  MetaCallJSON,
  LanguageId,
  DeployStatus,
} from '@metacall/protocol/deployment';
export type { Plans } from '@metacall/protocol/plan';

export type LogType = 'job' | 'deploy';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'http';
  message: string;
}
