/* eslint-disable @typescript-eslint/no-explicit-any */

// A question has a right answer to score against. Information, rating, video
// without options and open questions don't, so they can't lower or raise a score.
export const isGradable = (q: any) => {
  if (!q || q.isScored === false) return false;
  if (q.type === 'MCQ' || q.type === 'Video') return Boolean(q.correctAnswer);
  if (q.type === 'Swipe') return Boolean(q.correctDirection);
  if (q.type === 'Ordering') return Array.isArray(q.items) && q.items.length > 1;
  if (q.type === 'Chat Scenario') {
    return (
      (q.chatSteps || []).some((s: any) => (s.options || []).some((o: any) => o.isCorrect)) ||
      Boolean(q.correctAnswer)
    );
  }
  return false;
};

// Average score (0-100) over the answered questions that have a right answer;
// null when the module has none or none of them were answered.
export const gradedScore = (answers: any[] | undefined, questions: any[] | undefined) => {
  const gradableIds = new Set((questions || []).filter(isGradable).map((q: any) => q.id));
  const graded = (answers || []).filter((a: any) => gradableIds.has(a.questionId));
  if (graded.length === 0) return null;
  return Math.round(graded.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / graded.length);
};
