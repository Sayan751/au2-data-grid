// @ts-check
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import ts from 'typescript';

export class Transformer {
  /** @type {Map<string, string>} */
  templateLookup = new Map();

  /**
   * @param {ts.TypeChecker} typeChecker
   */
  constructor(typeChecker) {
    this.typeChecker = typeChecker;
  }

  /**
   * @returns {function(ts.TransformationContext): ts.Transformer<T>}
   * @template {ts.SourceFile} T
   */
  getInlineTemplateFactory() {
    return (ctx) => {
      const transformer = new InlineTemplateTransformer(this, ctx);
      const visitor = transformer.sourceFileVisitor.bind(transformer);
      return (node) => ts.isSourceFile(node)
        ? ts.visitNode(node, visitor)
        : node;
    };
  }

  /**
   * @param {ts.Node} node
   * @param {string} templateFileName
   * @returns {boolean}
   */
  _tryAddTemplateToLookup(node, templateFileName) {
    const canonicalTemplateSource = this._getCanonicalTemplateFileName(node, templateFileName);
    if (!existsSync(canonicalTemplateSource)) {
      console.error(`The template source file '${canonicalTemplateSource}' is not found.`);
      return false;
    }
    const template = readFileSync(canonicalTemplateSource, 'utf-8');
    this.templateLookup.set(canonicalTemplateSource, template);
    return true;
  }

  /**
   * @param {string} canonicalFileName
   */
  _getTemplateContent(canonicalFileName) {
    let content = this.templateLookup.get(canonicalFileName);
    if (content !== undefined) { return content; }
    if (!existsSync(canonicalFileName)) {
      console.error(`The template source file '${canonicalFileName}' is not found.`);
      return null;
    }
    const template = readFileSync(canonicalFileName, 'utf-8');
    this.templateLookup.set(canonicalFileName, template);
    return template;
  }

  /**
   * @param {ts.Node} node
   * @param {string} templateFileName
   * @returns {string}
   */
  _getCanonicalTemplateFileName(node, templateFileName) {
    const sourceFile = node.getSourceFile();
    const sourceFileName = sourceFile.fileName;
    const sourceDir = dirname(sourceFileName);
    const canonicalTemplateSource = resolve(sourceDir, templateFileName.replace(/['"]/g, ''));
    return canonicalTemplateSource;
  }
}

class InlineTemplateTransformer {
  /**
   * @param {Transformer} transformer
   * @param {ts.TransformationContext} ctx
   */
  constructor(transformer, ctx) {
    this.transformer = transformer;
    this.ctx = ctx;
  }

  /**
 * @param {ts.Node} node
 * @returns {ts.VisitResult<ts.Node>}
 */
  sourceFileVisitor(node) {
    // console.log('visiting source file: ', node.getSourceFile().fileName);
    return ts.visitEachChild(node, this.sourceFileContentVisitor, this.ctx);
  }

  /**
   * @param {ts.Node} node
   * @returns {ts.VisitResult<ts.Node>}
   */
  sourceFileContentVisitor = (node) => {
    try {
      if (ts.isImportDeclaration(node))
        return this.visitImportDeclaration(node);
      if (ts.isClassDeclaration(node))
        return ts.visitEachChild(node, this.decoratorVisitor, this.ctx);
      return node;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param {ts.ImportDeclaration} node
   * @returns {ts.VisitResult<ts.Node>}
   */
  visitImportDeclaration = (node) => {
    const templateSource = node.moduleSpecifier.getText();
    if (!/\.html['"]$/.test(templateSource))
      return node;
    return this.transformer._tryAddTemplateToLookup(node, templateSource) ? undefined : node;
  }

  /**
   * @param {ts.Node} node
   * @returns {ts.VisitResult<ts.Node>}
   */
  decoratorVisitor = (node) => {
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
      const templateInitializerSymbol = this.transformer.typeChecker.getSymbolAtLocation(
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

    const template = this.transformer._getTemplateContent(this.transformer._getCanonicalTemplateFileName(node, importDeclaration.moduleSpecifier.getText()));
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
}