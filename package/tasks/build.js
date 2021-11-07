// @ts-check
import { join } from 'path';
import ts from 'typescript';
import { getTsConfig } from './utilities.js';
import { createTransformer } from './transformer.js';

const cwd = process.cwd();
const src = join(cwd, 'src');
const parsedConfig = getTsConfig(src, cwd);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

const emitResult = program.emit(undefined, undefined, undefined, undefined, { before: [createTransformer(program)] });

const allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

let hasBuildError = false;
for (const diagnostic of allDiagnostics) {
  if (!diagnostic.file) {
    process.stdout.write(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') + '\n');
    continue;
  }
  const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
  const message = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
  switch (diagnostic.category) {
    case ts.DiagnosticCategory.Warning:
      process.stdout.write(`WARN: ${message}\n`);
      break;
    case ts.DiagnosticCategory.Error:
      hasBuildError = true;
      process.stderr.write(`ERROR: ${message}\n`);
      break;
  }
}

process.exit(
  hasBuildError
    ? 1
    : emitResult.emitSkipped ? 1 : 0);