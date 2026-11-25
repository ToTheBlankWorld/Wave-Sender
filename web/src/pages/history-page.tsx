import { Check, Copy, History, RadioTower, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copyText } from '@/lib/clipboard'
import { useWaveStore } from '@/store/wave-store'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function HistoryPage() {
  const { history, removeMessage, clearHistory } = useWaveStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const copyMessage = async (id: string, text: string) => {
    try {
      await copyText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1600)
    } catch {
      setError('The message could not be copied. Select it and copy it manually.')
    }
  }

  const clearAll = () => {
    if (window.confirm('Clear all received messages from this browser?')) clearHistory()
  }

  return (
    <div className="history-page section-wrap">
      <header className="page-heading">
        <div>
          <p className="section-kicker"><History size={16} /> Local archive</p>
          <h1>Received signals.</h1>
        </div>
        {history.length > 0 && (
          <button className="button-secondary danger-button" type="button" onClick={clearAll}>
            <Trash2 size={16} /> Clear history
          </button>
        )}
      </header>

      {error && <div className="studio-error" role="alert">{error}</div>}

      {history.length === 0 ? (
        <section className="empty-history">
          <div className="empty-history-icon"><RadioTower size={30} /></div>
          <h2>No messages yet.</h2>
          <p>Open the studio, start receiving, and play a signal from a nearby device.</p>
          <Link className="button-primary" to="/studio">Open the studio</Link>
        </section>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <article className="history-item" key={item.id}>
              <div className="history-item-icon"><RadioTower size={19} /></div>
              <div className="history-item-content">
                <p>{item.text}</p>
                <span>{dateFormatter.format(item.receivedAt)}</span>
              </div>
              <div className="history-item-actions">
                <button className="icon-button" type="button" aria-label="Copy message" onClick={() => void copyMessage(item.id, item.text)}>
                  {copiedId === item.id ? <Check size={17} /> : <Copy size={17} />}
                </button>
                <button className="icon-button" type="button" aria-label="Delete message" onClick={() => removeMessage(item.id)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="history-privacy">Stored only in this browser. Nothing is uploaded.</p>
    </div>
  )
}
