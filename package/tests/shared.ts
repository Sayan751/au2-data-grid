import { Constructable, IContainer } from '@aurelia/kernel';
import { CustomElementType, ICustomElementViewModel, IPlatform } from '@aurelia/runtime-html';
import { TestContext } from '@aurelia/testing';

/* eslint-disable mocha/no-exports, jsdoc/require-jsdoc, mocha/no-exclusive-tests, mocha/no-skipped-tests */
export class Person {
  public constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly age?: number,
  ) { }
}

export interface $TestContext<TApp extends ICustomElementViewModel> {
  ctx: TestContext;
  container: IContainer;
  host: HTMLElement;
  app: TApp;
  platform: IPlatform;
}
export interface TestSetupContext<TApp extends ICustomElementViewModel> {
  component: CustomElementType<Constructable<TApp>>;
}
export type TestFunction<
  TApp extends ICustomElementViewModel,
  TTestContext extends $TestContext<TApp> = $TestContext<TApp>,
  > = (ctx: TTestContext) => void | Promise<void>;
export type WrapperFunction<
  TApp extends ICustomElementViewModel,
  TTestContext extends $TestContext<TApp> = $TestContext<TApp>,
  TTestSetupContext extends TestSetupContext<TApp> = TestSetupContext<TApp>,
  > = (testFunction: TestFunction<TApp, TTestContext>, setupContext?: Partial<TTestSetupContext>) => void | Promise<void>;
type spec<
  TApp extends ICustomElementViewModel,
  TTestContext extends $TestContext<TApp>,
  TTestSetupContext extends TestSetupContext<TApp>
  > = (title: string, testFunction: TestFunction<TApp, TTestContext>, setupContext?: Partial<TTestSetupContext>) => void;
export type $It<
  TApp extends ICustomElementViewModel,
  TTestContext extends $TestContext<TApp> = $TestContext<TApp>,
  TTestSetupContext extends TestSetupContext<TApp> = TestSetupContext<TApp>,
  > = spec<TApp, TTestContext, TTestSetupContext> & {
    only: spec<TApp, TTestContext, TTestSetupContext>;
    skip: spec<TApp, TTestContext, TTestSetupContext>;
  };

export function createSpecFunction<
  TApp extends ICustomElementViewModel,
  TTestContext extends $TestContext<TApp>,
  TTestSetupContext extends TestSetupContext<TApp>
>(wrap: WrapperFunction<TApp, TTestContext, TTestSetupContext>): $It<TApp, TTestContext, TTestSetupContext> {

  function $it(title: string, testFunction: TestFunction<TApp, TTestContext>, setupContext?: Partial<TTestSetupContext>): void {
    it(title, async function () { await wrap(testFunction, setupContext); });
  }

  $it.only = function (title: string, testFunction: TestFunction<TApp, TTestContext>, setupContext?: Partial<TTestSetupContext>): void {
    it.only(title, async function () { await wrap(testFunction, setupContext); });
  };

  $it.skip = function (title: string, testFunction: TestFunction<TApp, TTestContext>, setupContext?: Partial<TTestSetupContext>): void {
    it.skip(title, async function () { await wrap(testFunction, setupContext); });
  };

  return $it;
}
/* eslint-enable mocha/no-exports, jsdoc/require-jsdoc, mocha/no-exclusive-tests, mocha/no-skipped-tests */
