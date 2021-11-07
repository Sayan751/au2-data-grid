import ts from 'typescript';

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
