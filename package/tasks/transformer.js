import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import ts from 'typescript';

/**
 * @param {ts.Program} program
 */
export function createTransformer(program) {
  const typeChecker = program.getTypeChecker();

  /** @type {Map<string, string>} */
  const templateLookup = new Map();

  /**
   *
   * @param {ts.TransformationContext} ctx
   * @returns {ts.Transformer<T>}
   * @template {ts.SourceFile} T
   */
  return function inlineTemplate(ctx) {
    return (node) => ts.isSourceFile(node)
      ? ts.visitNode(node, sourceFileVisitor)
      : node;

    /**
     * @param {ts.Node} node
     * @returns {ts.VisitResult<ts.Node>}
     */
    function sourceFileVisitor(node) {
      // console.log('visiting source file: ', node.getSourceFile().fileName);
      return ts.visitEachChild(node, sourceFileContentVisitor, ctx);
    }

    /**
     * @param {ts.Node} node
     * @returns {ts.VisitResult<ts.Node>}
     */
    function sourceFileContentVisitor(node) {
      try {
        if (ts.isImportDeclaration(node))
          return visitImportDeclaration(node);
        if (ts.isClassDeclaration(node))
          return ts.visitEachChild(node, decoratorVisitor, ctx);
        return node;
      } catch (e) {
        console.error(e);
      }
    }

    /**
     * @param {ts.ImportDeclaration} node
     * @returns {ts.VisitResult<ts.Node>}
     */
    function visitImportDeclaration(node) {
      const templateSource = node.moduleSpecifier.getText();
      if (!/\.html['"]$/.test(templateSource))
        return node;
      return tryAddTemplateToLookup(node, templateSource) ? undefined : node;
    }

    /**
     * @param {ts.Node} node
     * @returns {ts.VisitResult<ts.Node>}
     */
    function decoratorVisitor(node) {
      if (!ts.isDecorator(node))
        return node;

      const decoratorExpr = /** @type {ts.CallExpression} */ ( /** @type {ts.Decorator} */(node).expression);
      if (!ts.isCallExpression(decoratorExpr) || decoratorExpr.getFirstToken().getFullText() !== 'customElement')
        return node;

      const ceDefinitionExpr = /** @type {ts.ObjectLiteralExpression} */ (decoratorExpr.arguments[0]);
      if (!ts.isObjectLiteralExpression(ceDefinitionExpr))
        return node;

      const ceDefinitionProperties = ceDefinitionExpr.properties;
      const templateExpr = ceDefinitionProperties.find((p) => p.name.getText() === 'template');

      /** @type {ts.ImportDeclaration} */
      let importDeclaration;
      if (ts.isPropertyAssignment(templateExpr)) {
        const templateInitializerSymbol = typeChecker.getSymbolAtLocation(
                /** @type {typeof ts & { getEffectiveInitializer:(expr: ts.ObjectLiteralElementLike)=>ts.Node }} */(ts).getEffectiveInitializer(templateExpr)
        );
        importDeclaration = /** @type {ts.ImportDeclaration} */ (templateInitializerSymbol?.getDeclarations()[0].parent);
      } else if (ts.isShorthandPropertyAssignment(templateExpr)) {
        importDeclaration = /** @type {ts.ImportDeclaration} */ (node
          .getSourceFile()
          .getChildren()?.[0]
          .getChildren()
          .find((c) => ts.isImportDeclaration(c)
            && /** @type {ts.ImportDeclaration} */ (c).importClause.getText() === 'template'
          ));
      }
      if (importDeclaration == null || !ts.isImportDeclaration(importDeclaration))
        return node;

      const template = templateLookup.get(getCanonicalTemplateFileName(node, importDeclaration.moduleSpecifier.getText()));
      if (template == null)
        return node;
      const factory = ts.factory;
      const templateLiteral = factory.createNoSubstitutionTemplateLiteral(template);

      const newAssignment = factory.updatePropertyAssignment(/** @type {ts.PropertyAssignment} */(templateExpr), templateExpr.name, templateLiteral);
      const newCeDefinitionExpr = factory.updateObjectLiteralExpression(ceDefinitionExpr, ceDefinitionProperties.filter(x => x !== templateExpr).concat(newAssignment));
      const newCallExpression = factory.updateCallExpression(decoratorExpr, decoratorExpr.expression, undefined, [newCeDefinitionExpr]);
      const newDecorator = factory.updateDecorator(node, newCallExpression);

      return newDecorator;
    }

    /**
     * @param {ts.Node} node
     * @param {string} templateFileName
     * @returns {boolean}
     */
    function tryAddTemplateToLookup(node, templateFileName) {
      const canonicalTemplateSource = getCanonicalTemplateFileName(node, templateFileName);
      if (!existsSync(canonicalTemplateSource)) {
        console.error(`The template source file '${canonicalTemplateSource}' is not found.`);
        return false;
      }
      const template = readFileSync(canonicalTemplateSource, 'utf-8');
      templateLookup.set(canonicalTemplateSource, template);
      return true;
    }

    /**
     * @param {ts.Node} node
     * @param {string} templateFileName
     * @returns {string}
     */
    function getCanonicalTemplateFileName(node, templateFileName) {
      const sourceFile = node.getSourceFile();
      const sourceFileName = sourceFile.fileName;
      const sourceDir = dirname(sourceFileName);
      const canonicalTemplateSource = resolve(sourceDir, templateFileName.replace(/['"]/g, ''));
      return canonicalTemplateSource;
    }
  };
}
