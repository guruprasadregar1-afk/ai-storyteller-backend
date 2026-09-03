import { runFullPipelineController } from './src/modules/content/content.controller';

async function main() {
  const run = async (input: string) => {
    let resultData: any;
    const req = { body: { input } } as any;
    const res = { status: () => ({ json: (data: any) => { resultData = data; } }) } as any;
    await runFullPipelineController(req, res);
    return resultData;
  };

  const cinderella1 = await run('Cinderella');
  console.log('=== CINDERELLA 1 ===');
  console.log(JSON.stringify(cinderella1, null, 2));

  const cinderella2 = await run('Cinderella');
  console.log('=== CINDERELLA 2 CACHE ===');
  console.log(JSON.stringify(cinderella2, null, 2));

  const titanic = await run('Titanic');
  console.log('=== TITANIC ===');
  console.log(JSON.stringify(titanic, null, 2));

  const jungleBook = await run('The Jungle Book');
  console.log('=== JUNGLE BOOK ===');
  console.log(JSON.stringify(jungleBook, null, 2));

  const freeform = await run('A story about a brave little girl');
  console.log('=== FREEFORM ===');
  console.log(JSON.stringify(freeform, null, 2));
}

main().catch(console.error);
