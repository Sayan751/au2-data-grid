// @ts-check
import { join } from 'path';
import ts from 'typescript';
import { Transformer } from './transformer.js';

/**
 *
 * @param {string} sourceRoot
 * @param {string} cwd
 * @returns {ts.ParsedCommandLine}
 */
export function getTsConfig(sourceRoot, cwd) {
  const configFile = ts.findConfigFile(sourceRoot, ts.sys.fileExists, 'tsconfig.json');
  const tsconfig = ts.readConfigFile(configFile, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(tsconfig.config, ts.sys, cwd);
  return parsedConfig;
}

export function build(
  cwd = process.cwd(),
  src = join(cwd, 'src'),
  terminateProcess = true,
) {
  const parsedConfig = getTsConfig(src, cwd);
  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

  const emitResult = program.emit(
    undefined,
    undefined,
    undefined,
    undefined,
    { before: [Transformer.getInstance(program.getTypeChecker()).getInlineTemplateFactory()] });

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

  if (terminateProcess) {
    process.exit(
      hasBuildError
        ? 1
        : emitResult.emitSkipped ? 1 : 0);
  }
}