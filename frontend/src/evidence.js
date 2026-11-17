// An evidence item quotes one chat line, sometimes cut short with "…". Find that line in the saved lesson, so the
// page can say WHO spoke (some usability evidence quotes the student, for example "This is too hard") and can
// show the whole line. Nothing is judged here: it only looks the quote up. `results` is a run's results[].
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const stem = (s) => flat(s).replace(/[….]+$/, '').trim()
export function evidenceLine(results, e) {
  const lesson = results?.find((r) => r.student_id === e.student_id)
  const s = stem(e.quote)
  const lines = lesson?.transcript || []
  const hit = s.length > 3
    ? lines.find((m) => m.turn === e.turn && flat(m.text).startsWith(s)) ?? lines.find((m) => flat(m.text).startsWith(s))
    : null
  return hit ? { from: hit.from === 'tutor' ? 'tool' : 'student', text: hit.text } : { from: null, text: e.quote }
}
