// "How it works": what the lab does, in three numbered steps, always open.
// The stars are explained by the caption above the class, and the class panel says the students are simulated.
const STEPS = [
  { label: 'Test', text: 'The simulated students sit a short fractions test.' },
  { label: 'Lesson', text: 'One demo tool teaches each of them.' },
  { label: 'Same test again', text: 'We measure how many points each student gained.' },
]

export default function LabGuide() {
  return (
    <section className="lx-guide glass" aria-labelledby="lx-guide-how">
      <h3 id="lx-guide-how" className="lx-guide-h">How it works</h3>
      <ol className="lx-guide-steps">
        {STEPS.map((s, i) => (
          <li key={s.label}>
            <span className="lx-step-n">{i + 1}</span>
            <strong className="lx-step-label">{s.label}</strong>
            <span className="lx-step-text">{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
