// @ts-check
import { join } from 'path';
import ts from 'typescript';
import { Transformer } from './transformer.js';
import { getTsConfig } from './utilities.js';

const cwd = process.cwd();
const src = join(cwd, 'src');

const host = ts.createSolutionBuilderWithWatchHost();
const solutionBuilder = ts.createSolutionBuilderWithWatch(
  host,
  [cwd],
  { incremental: true },
  { watchDirectory: ts.WatchDirectoryKind.UseFsEvents }
);

// first emit
emit(true);


/**
 * @param {boolean} [force]
 */
function emit(force = false) {
  const project = /** @type {ts.BuildInvalidedProject} */(solutionBuilder.getNextInvalidatedProject());
  project?.emit(undefined, undefined, undefined, undefined, { before: [getTransformer(project)] });

  if (project == null && force) {
    console.log('project is null');
    solutionBuilder
      .build(
        undefined,
        undefined,
        undefined,
        () => ({ before: [getTransformer()] })
      );
  }
}

/**
 *
 * @param {ts.BuildInvalidedProject} [project]
 */
function getTransformer(project) {
  let typeChecker = project?.getProgram().getTypeChecker();
  if (typeChecker == null) {
    const parsedConfig = getTsConfig(src, cwd);
    typeChecker = ts.createProgram(parsedConfig.fileNames, parsedConfig.options).getTypeChecker();
  }

  return new Transformer(typeChecker).getInlineTemplateFactory();
}