/**
 * Output boundary for the export use case. The application layer writes plain
 * strings; where they end up (file, socket, stdout) is an implementation
 * detail of the adapter.
 */
export interface OutputWriter {
  writeLine(line: string): Promise<void>;

  close(): Promise<void>;
}
