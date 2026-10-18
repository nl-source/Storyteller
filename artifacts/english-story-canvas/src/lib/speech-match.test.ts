// Run with: pnpm --filter @workspace/english-story-canvas run test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVocab, matchAlternatives, matchUtterance } from './speech-match.ts';

const story = buildVocab(['apple', 'bee', 'eat', 'fly']);
const wind = buildVocab(['wind', 'umbrella', 'tree', 'blow', 'fly', 'softly', 'strongly', 'heavily']);
const rain = buildVocab(['rain', 'umbrella', 'tree', 'puddle', 'alice', 'fall', 'splash', 'softly', 'heavily']);

const words = (text: string, vocab = story) => matchUtterance(text, vocab).words;

test('exact words and inflections', () => {
  assert.deepEqual(words('apple'), ['apple']);
  assert.deepEqual(words('The bee eats the apple'), ['bee', 'eat', 'apple']);
  assert.deepEqual(words('bees flying'), ['bee', 'fly']);
});

test('typical mishearings of children are accepted', () => {
  assert.deepEqual(words('B.'), ['bee']);
  assert.deepEqual(words('be'), ['bee']);
  assert.deepEqual(words('fry'), ['fly']);
  assert.deepEqual(words('appo'), ['apple']);
  assert.deepEqual(words('apples fly'), ['apple', 'fly']);
  assert.deepEqual(words('the three', wind), ['tree']);
  assert.deepEqual(words('embrella', wind), ['umbrella']);
  assert.deepEqual(words('um brella', wind), ['umbrella']);
  assert.deepEqual(words('below', wind), ['blow']);
  assert.deepEqual(words('paddle', rain), ['puddle']);
  assert.deepEqual(words('poodle', rain), ['puddle']);
  assert.deepEqual(words('heavy rain', rain), ['heavily', 'rain']);
});

test('everyday-word aliases need another target word', () => {
  assert.deepEqual(words('it'), []);
  assert.deepEqual(words('bee it apple'), ['bee', 'eat', 'apple']);
  assert.deepEqual(words('when', wind), []);
  assert.deepEqual(words('when blows the tree', wind), ['wind', 'blow', 'tree']);
  assert.deepEqual(words('win', wind), []);
  assert.deepEqual(words('blue', wind), []);
});

test('ordinary words are not turned into vocabulary', () => {
  for (const text of ['hello', 'banana', 'what is this', 'I like it', 'mommy', 'happy birthday', 'okay okay', 'water', 'yellow', 'sunny day', 'big dog']) {
    assert.deepEqual(words(text), [], text);
    assert.deepEqual(words(text, wind), [], `${text} (wind)`);
    assert.deepEqual(words(text, rain), [], `${text} (rain)`);
  }
});

test('an extra vowel after the last consonant is tolerated', () => {
  // Learners often add a vowel ("wind-uh"), which recognisers write as a longer word.
  assert.deepEqual(words('window', wind), ['wind']);
});

test('canonical sentence keeps grammar the canvas reads', () => {
  assert.equal(matchUtterance('the win blows the three heavy', wind).canonical, 'the wind blows the tree heavily');
  assert.equal(matchUtterance('the tree fries', wind).canonical, 'the tree flies');
  assert.equal(matchUtterance('the umbrella blew the tree strong', wind).canonical, 'the umbrella blow the tree strongly');
});

test('the best alternative transcript wins', () => {
  const result = matchAlternatives(['the be at apple', 'the bee eat apple', 'baby tapple'], story);
  assert.deepEqual(result.words, ['bee', 'eat', 'apple']);
  assert.deepEqual(matchAlternatives(['hello there', 'hello bee'], story).words, ['bee']);
});
