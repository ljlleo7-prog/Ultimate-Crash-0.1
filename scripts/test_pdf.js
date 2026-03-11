import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('Is pdf a function?', typeof pdf === 'function');
console.log('Keys of pdf:', Object.keys(pdf));
