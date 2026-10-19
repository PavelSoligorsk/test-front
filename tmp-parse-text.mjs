import fs from 'fs';

const src = fs.readFileSync('src/components/Theory.jsx', 'utf8');
const start = src.indexOf('const convertMarkdownLists');
const end2 = src.indexOf('function theoryCopyPayload');
const chunk2 = src.slice(start, end2);
const sample = fs.readFileSync('tmp-text-sample.xml', 'utf8');
const api = new Function(`${chunk2}\nreturn { parseGeoGebraInner, parseTheorySections, parseBlocks };`)();

const innerStart = sample.indexOf('>') + 1;
const innerEnd = sample.lastIndexOf('</GeoGebra>');
const inner = sample.slice(innerStart, innerEnd);
const doc = `<Section id="parabola-direction" title="Направление ветвей параболы">\n${sample}\n</Section>\n<Section id="zeros-and-discriminant" title="Нули функции и дискриминант">\n<Def title="Нули функции">текст</Def>\n</Section>`;
const sections = api.parseTheorySections(doc);
for (const section of sections) {
  console.log('SECTION', section.id, 'blocks', section.orderedBlocks.map((b) => b.type));
  for (const block of section.orderedBlocks) {
    if (block.type !== 'geogebra') continue;
    console.log('setup tail', JSON.stringify((block.setup || '').slice(-80)));
    console.log('controls', block.controls?.length, 'texts', block.texts?.length);
    console.log('text parts', JSON.stringify(block.texts));
  }
}
const parsed = api.parseGeoGebraInner(inner);
console.log('controls', JSON.stringify(parsed.controls, null, 2));
console.log('texts count', parsed.texts.length);
for (const text of parsed.texts) {
  console.log('--- parts', text.parts.map((p) => p.type));
  for (const part of text.parts) {
    if (part.type === 'expr') {
      console.log('EXPR SOURCE:\n', part.source);
      try {
        const compiled = new Function(`return (${part.source})`)();
        console.log('RESULT a=0.8:\n', compiled({ a: 0.8 }));
      } catch (err) {
        console.log('COMPILE/RUN ERROR', err);
      }
    } else {
      console.log('MD', JSON.stringify(part.value));
    }
  }
}

