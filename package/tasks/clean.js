// @ts-check
import { rmSync } from 'fs';
import { join, resolve } from 'path';

rmSync(join(process.cwd(), 'dist'), { force: true, recursive: true });