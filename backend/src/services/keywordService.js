// const natural = require('natural');
// const _ = require('lodash');

// const tokenizer = new natural.WordTokenizer();

// const STOPWORDS = new Set([
//   'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
//   'he','as','you','do','at','this','but','his','by','from','they','we','say','her',
//   'she','or','an','will','my','one','all','would','there','their','what','so','up',
//   'out','if','about','who','get','which','go','me','when','make','can','like','time',
//   'no','just','him','know','take','people','into','year','your','good','some','could',
//   'them','see','other','than','then','now','its','only','come','over','think','also',
//   'back','after','use','two','how','our','work','first','well','way','even','new',
//   'want','because','any','these','give','most','us','been','has','are','was','were',
//   'said','had','more','may','than','per','while','among','amid','yet',
// ]);

// const extractKeywords = (text, maxKeywords = 10) => {
//   if (!text || text.trim().length < 10) return [];

//   try {
//     const tokens = tokenizer
//       .tokenize(text.toLowerCase())
//       .filter((t) => t.length > 3 && !STOPWORDS.has(t) && /^[a-z]+$/.test(t));

//     if (tokens.length === 0) return [];

//     const freq = _.countBy(tokens);
//     return Object.entries(freq)
//       .map(([word, count]) => ({ word, score: parseFloat((count * (1 + word.length * 0.05)).toFixed(3)) }))
//       .sort((a, b) => b.score - a.score)
//       .slice(0, maxKeywords);
//   } catch {
//     return [];
//   }
// };

// const computeKeywordTrends = (articles) => {
//   const keywordMap = {};

//   for (const article of articles) {
//     const keywords = article.keywords || [];
//     for (const word of keywords) {
//       if (!word || typeof word !== 'string') continue;
//       if (!keywordMap[word]) {
//         keywordMap[word] = { keyword: word, count: 0, sentimentSum: 0 };
//       }
//       keywordMap[word].count++;
//       keywordMap[word].sentimentSum += article.sentimentScore || 0;
//     }
//   }

//   return Object.values(keywordMap)
//     .filter((k) => k.count >= 2)
//     .map((k) => ({
//       ...k,
//       avgSentiment: parseFloat((k.sentimentSum / k.count).toFixed(4)),
//     }))
//     .sort((a, b) => b.count - a.count)
//     .slice(0, 50);
// };

// module.exports = { extractKeywords, computeKeywordTrends };



const STOPWORDS = new Set([
  'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say','her',
  'she','or','an','will','my','one','all','would','there','their','what','so','up',
  'out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','its','only','come','over','think','also',
  'back','after','use','two','how','our','work','first','well','way','even','new',
  'want','because','any','these','give','most','us','been','has','are','was','were',
  'said','had','more','may','per','while','among','amid','yet','will','says','say',
  'told','report','according','including','following','during','within','without',
]);

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t) && /^[a-z]+$/.test(t));
};

const extractKeywords = (text, maxKeywords = 10) => {
  if (!text || text.trim().length < 10) return [];

  try {
    const tokens = tokenize(text);
    if (tokens.length === 0) return [];

    const freq = {};
    for (const token of tokens) {
      freq[token] = (freq[token] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  } catch {
    return [];
  }
};

const computeKeywordTrends = (articles) => {
  const keywordMap = {};

  for (const article of articles) {
    const keywords = article.keywords || [];
    for (const word of keywords) {
      if (!word || typeof word !== 'string') continue;
      if (!keywordMap[word]) {
        keywordMap[word] = { keyword: word, count: 0, sentimentSum: 0 };
      }
      keywordMap[word].count++;
      keywordMap[word].sentimentSum += article.sentimentScore || 0;
    }
  }

  return Object.values(keywordMap)
    .filter((k) => k.count >= 2)
    .map((k) => ({
      ...k,
      avgSentiment: parseFloat((k.sentimentSum / k.count).toFixed(4)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
};

module.exports = { extractKeywords, computeKeywordTrends };