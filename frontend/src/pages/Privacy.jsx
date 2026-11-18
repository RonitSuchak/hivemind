import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks.js'
import { useMatch } from '../store.jsx'

// What Hivemind keeps, where, and how to delete it. Every line here must match what the code does:
// store.jsx (hm-saved, hm-lang), at/ground.js (at-ground), api.js (what each request sends).
export default function Privacy() {
  usePageTitle('Privacy')
  const { saved, forgetSaved } = useMatch()
  return (
    <article className="pv">
      <h1>Your data on Hivemind</h1>
      <p className="pv-lede">We never ask for your name, age or email, and we use no cookies. Here is everything we keep and how to delete it.</p>

      <section aria-labelledby="pv-device">
        <h2 id="pv-device">On this device</h2>
        <ul>
          <li><strong>Your results</strong>, only if you press &ldquo;Save on this device&rdquo;: your profile numbers, the simulated students you matched, the ranking, the subject you chose and the tools you said you use.</li>
          <li><strong>The language</strong> the site is shown in, and <strong>the colour</strong> you picked (white or midnight).</li>
        </ul>
        <p>This sits in your browser&rsquo;s storage, not in a cookie, and it never leaves this device. It stays until you delete it.</p>
        {saved
          ? <p><button type="button" className="btn" onClick={forgetSaved}>Delete my saved results</button></p>
          : <p>You have no saved results on this device.</p>}
      </section>

      <section aria-labelledby="pv-lab">
        <h2 id="pv-lab">Sent to the lab</h2>
        <ul>
          <li><strong>The check:</strong> your answers and the subject you chose. The lab turns them into five profile numbers and keeps only those, with the date, for 7 days.</li>
          <li><strong>Try a tool:</strong> your messages go to the lab and to Google&rsquo;s Gemini AI to write the replies. Personal details are removed first, and the chat is forgotten after 30 minutes.</li>
          <li><strong>The suggestion box:</strong> your suggestion and the date, with personal details removed.</li>
          <li><strong>Check our prediction:</strong> a code you make up, your two test scores and the tool you tried.</li>
        </ul>
        <p>None of this says who you are: no name, age, email or address, and no IP address is stored.</p>
      </section>

      <section aria-labelledby="pv-delete">
        <h2 id="pv-delete">Deleting it</h2>
        <p>Press &ldquo;Delete saved results&rdquo; on your <Link to="/results">results</Link> or above, or clear this site&rsquo;s data in your browser settings. What the lab keeps cannot be linked back to you, so there is nothing personal to delete there.</p>
      </section>
    </article>
  )
}
