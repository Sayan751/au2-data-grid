// @ts-check
const faker = require('faker');
const fs = require('fs');

const size = Number(process.argv[2]);
if (!Number.isInteger(size)) throw new Error(`Invalid size; expected an integer got ${size}`);

const data = new Array(size);
for (let i = 0; i < size; i++) {
  const gender = /** @type {(binary: boolean) => string} */ (faker.name.gender)(Math.random() > 0.5);
  data[i] = {
    firstName: faker.name.firstName(/** @type {any} */(gender)),
    lastName: faker.name.firstName(/** @type {any} */(gender)),
    age: faker.datatype.number({ min: 15, max: 90 }),
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
    switch (faker.animal.type()) {
      case 'dog':
      default:
        pets[i] = faker.animal.dog();
        break;
      case 'cat':
        pets[i] = faker.animal.cat();
        break;
      case 'bird':
        pets[i] = faker.animal.bird();
        break;
      case 'fish':
        pets[i] = faker.animal.fish();
        break;
      case 'rabbit':
        pets[i] = faker.animal.rabbit();
        break;
    }
  }
  return pets;
}