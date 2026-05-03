const Sentiment = require('sentiment');

const analyzer = new Sentiment();

const analyzeSentiment = (text) => {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral', magnitude: 0 };
  }

  try {
    const result = analyzer.analyze(text);
    const wordCount = Math.max(result.words.length, 1);
    const normalizedScore = Math.max(-1, Math.min(1, result.score / (wordCount * 2)));
    const magnitude = Math.abs(normalizedScore);

    let label = 'neutral';
    if (normalizedScore > 0.05) label = 'positive';
    else if (normalizedScore < -0.05) label = 'negative';

    return {
      score: parseFloat(normalizedScore.toFixed(4)),
      label,
      magnitude: parseFloat(magnitude.toFixed(4)),
    };
  } catch {
    return { score: 0, label: 'neutral', magnitude: 0 };
  }
};

const aggregateSentiment = (articles) => {
  if (!articles || articles.length === 0) {
    return { avg: 0, distribution: { positive: 0, negative: 0, neutral: 0 }, trend: 'stable' };
  }

  const scores = articles.map((a) => a.sentimentScore || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const distribution = articles.reduce(
    (acc, a) => {
      const label = a.sentimentLabel || 'neutral';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

  const third = Math.max(Math.floor(scores.length / 3), 1);
  const recentAvg = scores.slice(-third).reduce((a, b) => a + b, 0) / third;
  const olderAvg = scores.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const delta = recentAvg - olderAvg;

  let trend = 'stable';
  if (delta > 0.05) trend = 'improving';
  else if (delta < -0.05) trend = 'declining';
  else if (scores.some((s) => Math.abs(s) > 0.5)) trend = 'volatile';

  return {
    avg: parseFloat(avg.toFixed(4)),
    distribution,
    trend,
    recentAvg: parseFloat(recentAvg.toFixed(4)),
  };
};

module.exports = { analyzeSentiment, aggregateSentiment };