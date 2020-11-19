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
    const a = $('h4 a').toArray();
    const data = {
      name: $(strong[1]).text(),
      postcode: $(strong[2]).text(),
      state: $(a[1]).text().trim(),
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
  const results = await (await asyncPool(50, detailsUrl, getInfo)).filter(
    Boolean,
  );

  const dictData = results.reduce((acc, cur) => {
    acc[cur.postcode] = acc[cur.postcode] || [];
    acc[cur.postcode].push(cur.name);
    return acc;
  }, {});

  fs.writeJsonSync('./data/' + state + '.json', results, {
    spaces: 4,
  });

  fs.writeJsonSync('./data/' + state + '_dict.json', dictData, {
    spaces: 4,
  });
}
async function getCommonPostCode() {
  const res = await axios.get('http://post-code.net.au/common');
  const $ = cheerio.load(res.data);
  const list = $('table td a')
    .toArray()
    .map((x) => $(x).attr('href'));

  const results = await (await asyncPool(50, list, getInfo)).filter(Boolean);

  fs.writeJsonSync('./data/common.json', results);
}
(async () => {
  await getCommonPostCode();
  await fetch('vic');
  await fetch('tas');
  await fetch('wa');
  await fetch('nt');
  await fetch('nsw');
  await fetch('qld');
  await fetch('act');
  await fetch('sa');
})();
