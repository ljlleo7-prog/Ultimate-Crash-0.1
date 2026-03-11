import { PDFParse } from 'pdf-parse';

console.log('Prototype methods:', Object.getOwnPropertyNames(PDFParse.prototype));
console.log('Static methods:', Object.getOwnPropertyNames(PDFParse));
