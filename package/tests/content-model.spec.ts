import { assert } from 'chai';
import { ContentModel } from '../src/content-model';

describe('content-model', function () {
  it('works', function () {
    assert.isDefined(
      new ContentModel(
        [],
        null,
        null,
        null,
        { scopeTo() { } } as any
      ));
  });
});