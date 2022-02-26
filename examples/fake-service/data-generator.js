// @ts-check
const falso = require('@ngneat/falso');
const fs = require('fs');

const size = Number(process.argv[2]);
if (!Number.isInteger(size)) throw new Error(`Invalid size; expected an integer got ${size}`);

const data = new Array(size);
for (let i = 0; i < size; i++) {
  const gender = falso.randGender();
  data[i] = {
    firstName: falso.randFirstName(),
    lastName: falso.randLastName(),
    age: falso.randNumber({ min: 15, max: 90 }),
    gender,
    pets: getPets(),
  };
}

const content = `/**
 * This is a automatically generated file via data-generator.js.
 * Don't change this by hand.
 */

import { Person } from './data-contracts.js';

// length: ${size}
export const people: Person[] = ${JSON.stringify(data, undefined, 2)};
`;

fs.writeFileSync('./src/data.ts', content);

function getPets() {
  const numPets = Math.random() > 0.7 ? Math.ceil(Math.random() * 5) : 0;
  if (numPets === 0) return [];

  const pets = new Array(numPets);
  for (let i = 0; i < numPets; i++) {
    switch (falso.randAnimalType()) {
      case 'dog':
      default:
        pets[i] = falso.randDog();
        break;
      case 'cat':
        pets[i] = falso.randCat();
        break;
      case 'bird':
        pets[i] = falso.randBird();
        break;
      case 'fish':
        pets[i] = falso.randFish();
        break;
      case 'rabbit':
        pets[i] = falso.randRabbit();
        break;
    }
  }
  return pets;
}