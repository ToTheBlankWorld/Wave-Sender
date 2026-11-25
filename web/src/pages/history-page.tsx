import { Check, Copy, History, RadioTower, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
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
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }, [])

  const copyMessage = async (id: string, text: string) => {
    try {
      await copyText(text)
      setCopiedId(id)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1600)
    } catch {
      setError('The message could not be copied. Select it and copy it manually.')
    }
  }

  return (
    <div className="history-page section-wrap">
      <header className="page-heading">
        <div>
          <p className="section-kicker"><History size={16} /> Local archive</p>
          <h1>Received signals.</h1>
        </div>
        {history.length > 0 && (
          confirmClear ? (
            <div className="confirm-inline" role="group" aria-label="Confirm clearing history">
              <button
                className="button-secondary danger-confirm"
                type="button"
                onClick={() => {
                  clearHistory()
                  setConfirmClear(false)
                }}
              >
                <Trash2 size={15} /> Confirm clear
              </button>
              <button className="icon-button" type="button" aria-label="Cancel clear" onClick={() => setConfirmClear(false)}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <button className="button-secondary danger-button" type="button" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} /> Clear history
            </button>
          )
        )}
      </header>

      {error && <div className="studio-error" role="alert">{error}</div>}
      <span className="sr-only" role="status" aria-live="polite">{copiedId ? 'Message copied.' : ''}</span>

      {history.length === 0 ? (
        <section className="empty-history">
          <div className="empty-history-icon"><RadioTower size={30} /></div>
          <h2>No messages yet.</h2>
          <p>Open the studio, start receiving, and play a signal from a nearby device.</p>
          <Link className="button-primary" to="/studio?mode=receive">Open the studio</Link>
        </section>
      ) : (
        <div className="history-list">
          <AnimatePresence initial={false}>
            {history.map((item) => (
              <motion.article
                className="history-item"
                key={item.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="history-item-icon"><RadioTower size={19} /></div>
                <div className="history-item-content">
                  <p>{item.text}</p>
                  <span>{dateFormatter.format(item.receivedAt)}</span>
                </div>
                <div className="history-item-actions">
                  <button className="icon-button" type="button" aria-label="Copy message" onClick={() => void copyMessage(item.id, item.text)}>
                    {copiedId === item.id ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                  {confirmDeleteId === item.id ? (
                    <button
                      className="inline-confirm-chip"
                      type="button"
                      aria-label="Confirm delete message"
                      onClick={() => {
                        removeMessage(item.id)
                        setConfirmDeleteId(null)
                      }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Delete message"
                      onClick={() => setConfirmDeleteId(item.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="history-privacy">Stored only in this browser. Nothing is uploaded.</p>
    </div>
  )
}
