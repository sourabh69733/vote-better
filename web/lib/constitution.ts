export const constitutionSource = {
  title: "Constitution of India, Legislative Department",
  url: "https://www.legislative.gov.in/constitution-of-india",
};

export type ConstitutionTopic = {
  id: string;
  question: string;
  answer: string;
  example: string;
  points: { label: string; detail: string; articles: string }[];
};

export type ConstitutionQuestion = {
  id: string;
  question: string;
  answer: string;
  articles: string;
  topicId: string;
  guideId?: string;
  keywords: string[];
};

export type GuideSourceKind = "constitution" | "court" | "law";

export type ConstitutionGuide = {
  id: string;
  title: string;
  summary: string;
  glance: { tone: "yes" | "limit" | "no"; heading: string; text: string }[];
  sections: {
    heading: string;
    intro: string;
    items: { label: string; detail: string; ref: string; kind: GuideSourceKind }[];
  }[];
  checklist: string[];
};

export type QuestionMatch = ConstitutionQuestion & { score: number };

function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

const stopWords = new Set([
  "a", "an", "the", "is", "are", "am", "do", "does", "can", "i", "my", "me", "to", "of", "in", "on",
  "for", "be", "by", "or", "and", "what", "who", "how", "if", "it", "at", "as", "we", "our", "there",
  "any", "will", "should", "about", "with", "from", "which", "when", "why", "get", "has", "have",
]);

export function searchQuestions(questions: ConstitutionQuestion[], query: string, limit = 3): QuestionMatch[] {
  const queryWords = words(query);
  if (queryWords.length === 0) return [];
  const articleNumbers = query.match(/\b\d{1,3}[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];

  return questions
    .map((item) => {
      const titleWords = new Set(words(item.question));
      const keywordWords = new Set(item.keywords.flatMap(words));
      const answerWords = new Set(words(item.answer));
      const articleRefs = item.articles.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (keywordWords.has(word)) score += 3;
        if (titleWords.has(word)) score += 2;
        if (answerWords.has(word)) score += 1;
        else if (word.length > 3 && [...keywordWords, ...titleWords].some((known) => known.startsWith(word))) score += 1;
      }
      for (const number of articleNumbers) {
        if (new RegExp(`\\b${number}\\b`).test(articleRefs)) score += 4;
      }
      return { ...item, score };
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
