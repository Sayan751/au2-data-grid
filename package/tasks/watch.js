// @ts-check
import { watch } from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { build } from './utilities.js';
import { Transformer } from './transformer.js';

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
emit();

/** @type {NodeJS.Timeout} */
let timeoutId = null;
// and watch
const watcher = watch(
  src,
  { recursive: true, persistent: true },
  (_, fileName) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    } else {
      console.log('change detected');
    }
    timeoutId = setTimeout(() => {
      Transformer.getInstance().evictTemplateCache(join(src, fileName));
      emit();
      timeoutId = null;
    }, 1000);
  }
);

function emit() {
  console.log('emitting');
  const project = /** @type {ts.BuildInvalidedProject} */(solutionBuilder.getNextInvalidatedProject());
  project?.emit(
    undefined,
    undefined,
    undefined,
    undefined,
    { before: [Transformer.getInstance(project.getProgram().getTypeChecker()).getInlineTemplateFactory()] });

  if (project == null) {
    // console.log('doing normal build');
    build(cwd, src, false);
  }
  console.log('watching for change');
}