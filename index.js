import axios from 'axios';
import asyncPool from 'tiny-async-pool';
import fs from 'fs-extra';

import cheerio from 'cheerio';
async function getStateLink(state) {
  const url = 'http://post-code.net.au/' + state + '/';
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const urls = $('table a')
    .toArray()
    .map((x) => 'http://post-code.net.au' + $(x).attr('href'));

  return urls;
}

async function getPostCodeListUrl(url) {
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const urls = $('table a')
    .toArray()
    .map((x) => $(x).attr('href'));

  return urls;
}

async function getInfo(url) {
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const strong = $('#colTwo strong').toArray();
    const data = {
      name: $(strong[1]).text(),
      postcode: $(strong[2]).text(),
    };

    console.log(data);
    return data;
  } catch (err) {
    console.error('Error: ', url);
  }
  return null;
}
async function fetch(state) {
  const urls = await getStateLink(state);
  const allUrls = await Promise.all(urls.map((x) => getPostCodeListUrl(x)));

  const detailsUrl = allUrls.flat();
  console.log('Total postcode found', detailsUrl.length);
  const results = await asyncPool(50, detailsUrl, getInfo);

  fs.writeJsonSync('./data/' + state + '.json', results.filter(Boolean), {
    spaces: 4,
  });
}
(async () => {
  //await fetch('vic');
  //await fetch('tas');
  // await fetch('wa');
  // await fetch('nt');
  // await fetch('nsw');
  await fetch('qld');
  await fetch('act');
  await fetch('sa');
})();
