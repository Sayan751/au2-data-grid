// @ts-check
import { rmSync } from 'fs';
import { join } from 'path';

rmSync(join(process.cwd(), 'dist'), { force: true, recursive: true });