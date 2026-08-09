'use client'

import { Button } from '@/components/ui/button'
import { expert, type ChatMessage } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import { MessageCircleWarning, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.from === 'uretici'
  const isProblem = msg.kind === 'sorun'

  return (
    <div className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5',
          mine
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-card text-card-foreground border border-border',
        )}
      >
        {isProblem && (
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              mine
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            <MessageCircleWarning className="size-3" aria-hidden="true" />
            Sorun{msg.topic ? ` · ${msg.topic}` : ''}
          </span>
        )}
        {msg.photo && (
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={msg.photo || '/placeholder.svg'}
              alt="Ek fotoğraf"
              className="max-h-52 w-full object-cover"
            />
          </div>
        )}
        {msg.text && (
          <p className="text-[15px] leading-snug text-pretty">{msg.text}</p>
        )}
        <span
          className={cn(
            'self-end text-[10px]',
            mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {msg.time}
        </span>
      </div>
    </div>
  )
}

export function ChatView({
  messages,
  onSend,
  onReportProblem,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onReportProblem: () => void
}) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function submit() {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {expert.name
            .split(' ')
            .slice(-2)
            .map((w) => w[0])
            .join('')}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {expert.name}
          </p>
          <p className="text-xs text-muted-foreground">{expert.role}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          <div className="mx-auto mb-1 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            Uzmanınla buradan yazışabilirsin
          </div>
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card px-3 pt-2 pb-3">
        <Button
          variant="outline"
          onClick={onReportProblem}
          className="mb-2 h-11 w-full rounded-xl border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          <MessageCircleWarning className="size-4" aria-hidden="true" />
          Sorun bildir
        </Button>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Mesaj yaz…"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <Button
            onClick={submit}
            disabled={!text.trim()}
            size="icon-lg"
            className="size-12 shrink-0 rounded-2xl"
            aria-label="Gönder"
          >
            <Send className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
